// API governance helpers: per-call logging, enable/disable toggles, usage queries.
// Logging must never break the feature that called it — every write is wrapped in try/catch.

import { run, query } from '../db/db';
import { Preferences } from '@capacitor/preferences';

// ── Toggle flags ──────────────────────────────────────────────────────────────

// Read a provider's enabled flag from Preferences.
// First-time read defaults to ON and persists that default so the value always exists.
export async function getApiEnabled(provider) {
  const key = `${provider}_enabled`;
  const { value } = await Preferences.get({ key });
  if (value === null) {
    await Preferences.set({ key, value: 'true' });
    return true;
  }
  return value === 'true';
}

export async function setApiEnabled(provider, enabled) {
  await Preferences.set({ key: `${provider}_enabled`, value: enabled ? 'true' : 'false' });
}

// ── Logging ───────────────────────────────────────────────────────────────────

// Log a single API call. Never throws — logging must not block the caller.
// row: { provider, endpoint?, model?, inputTokens?, outputTokens?,
//         quotaUsed?, quotaLeft?, ok?: bool, note? }
export async function logApiCall(row) {
  try {
    await run(
      `INSERT INTO api_usage
         (ts, provider, endpoint, model, inputTokens, outputTokens, quotaUsed, quotaLeft, ok, note)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        new Date().toISOString(),
        row.provider,
        row.endpoint ?? null,
        row.model ?? null,
        row.inputTokens ?? null,
        row.outputTokens ?? null,
        row.quotaUsed ?? null,
        row.quotaLeft ?? null,
        row.ok === false ? 0 : 1,
        row.note ?? null,
      ],
    );
  } catch (e) {
    console.error('[apiUsage] log failed:', e);
  }
}

// ── Queries ───────────────────────────────────────────────────────────────────

// Aggregate totals per provider. Also returns today's Spoonacular call count
// and the most recently reported quotaLeft value.
export async function usageSummary() {
  const totals = await query(
    `SELECT provider,
            COUNT(*)                                      AS calls,
            SUM(CASE WHEN ok=1 THEN 1 ELSE 0 END)        AS successes,
            SUM(inputTokens)                              AS inputTokens,
            SUM(outputTokens)                             AS outputTokens
     FROM api_usage
     GROUP BY provider`,
  );

  const today = new Date().toISOString().slice(0, 10);
  const spooToday = await query(
    `SELECT COUNT(*) AS callsToday
     FROM api_usage
     WHERE provider = 'spoonacular' AND ts >= ?`,
    [today + 'T00:00:00.000Z'],
  );

  // Most recently reported quota remaining for Spoonacular.
  const quotaRow = await query(
    `SELECT quotaLeft FROM api_usage
     WHERE provider = 'spoonacular' AND quotaLeft IS NOT NULL
     ORDER BY ts DESC LIMIT 1`,
  );

  return {
    totals,
    spooCallsToday: spooToday[0]?.callsToday ?? 0,
    spooQuotaLeft: quotaRow[0]?.quotaLeft ?? null,
  };
}

export async function recentCalls(limit = 25) {
  return query(`SELECT * FROM api_usage ORDER BY ts DESC LIMIT ?`, [limit]);
}

export async function clearUsage() {
  await run(`DELETE FROM api_usage`);
}
