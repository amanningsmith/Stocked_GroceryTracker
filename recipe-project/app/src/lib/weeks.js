// Meal-week generation (spec MVP2).
// Weeks are Sun–Sat, anchored to the calendar year:
//   - Week 1 starts Jan 1 and runs through the first Saturday (PARTIAL unless Jan 1 is Sunday).
//   - Subsequent weeks are full Sun–Sat.
//   - The final week is clipped at Dec 31 (PARTIAL unless Dec 31 is Saturday).
// For 2026 (Jan 1 = Thursday) this yields ~53 entries with partial first and last.

import { uid, upsert, query } from '../db/db';

const COLS = ['id', 'year', 'weekNumber', 'startDate', 'endDate', 'isPartial'];

function iso(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(d, n) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

// Build the full week list for a year (no DB writes — pure).
export function generateWeeks(year) {
  const weeks = [];
  const yearEnd = new Date(Date.UTC(year, 11, 31));
  let cursor = new Date(Date.UTC(year, 0, 1)); // Jan 1
  let weekNumber = 1;

  while (cursor <= yearEnd) {
    // Saturday is day 6. Distance to the upcoming Saturday from `cursor`.
    const toSaturday = (6 - cursor.getUTCDay() + 7) % 7;
    let end = addDays(cursor, toSaturday);
    if (end > yearEnd) end = yearEnd; // clip the final partial week

    const isPartialStart = weekNumber === 1 && cursor.getUTCDay() !== 0;
    const isPartialEnd = end.getTime() === yearEnd.getTime() && end.getUTCDay() !== 6;

    weeks.push({
      id: `w_${year}_${weekNumber}`,
      year,
      weekNumber,
      startDate: iso(cursor),
      endDate: iso(end),
      isPartial: isPartialStart || isPartialEnd ? 1 : 0,
    });

    cursor = addDays(end, 1);
    weekNumber += 1;
  }
  return weeks;
}

// Persist the year's weeks (idempotent via upsert).
export async function ensureWeeks(year) {
  const weeks = generateWeeks(year);
  for (const w of weeks) await upsert('week', w, COLS);
  return weeks;
}

// The week containing a given date (defaults to today).
export async function currentWeek(year = new Date().getUTCFullYear(), onDate = new Date()) {
  await ensureWeeks(year);
  const d = iso(onDate);
  const rows = await query(
    'SELECT * FROM week WHERE year = ? AND startDate <= ? AND endDate >= ? LIMIT 1',
    [year, d, d],
  );
  return rows[0] || null;
}

// The list of day ISO-dates inside a week, for the calendar grid.
export function daysOf(week) {
  const out = [];
  let d = new Date(`${week.startDate}T00:00:00Z`);
  const end = new Date(`${week.endDate}T00:00:00Z`);
  while (d <= end) { out.push(iso(d)); d = addDays(d, 1); }
  return out;
}

export { uid };
