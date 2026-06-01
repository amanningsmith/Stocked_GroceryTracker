import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { SCHEMA } from './schema';

// Single shared connection for the app. SQLite is the source of truth for all
// user data (recipes cache, weeks, meals, shopping, pantry, cook logs).

const DB_NAME = 'recipe_app';
const sqlite = new SQLiteConnection(CapacitorSQLite);
let db = null;

// JSON columns that should be parsed on read / stringified on write.
const JSON_COLS = new Set([
  'dietaryTags', 'macroContributors', 'ingredients', 'steps',
  'fromRecipes', 'photos',
]);

export async function initDb() {
  if (db) return db;

  // On web, @capacitor-community/sqlite runs through the <jeep-sqlite> element
  // and an IndexedDB-backed store. This is dev-only; native Android uses real SQLite.
  if (Capacitor.getPlatform() === 'web') {
    await customElements.whenDefined('jeep-sqlite');
    const jeep = document.querySelector('jeep-sqlite');
    await jeep.componentOnReady?.();
    await sqlite.initWebStore();
  }

  const ret = await sqlite.checkConnectionsConsistency();
  const isConn = (await sqlite.isConnection(DB_NAME, false)).result;
  db = ret.result && isConn
    ? await sqlite.retrieveConnection(DB_NAME, false)
    : await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);

  await db.open();
  for (const stmt of SCHEMA) await db.execute(stmt);
  if (Capacitor.getPlatform() === 'web') await sqlite.saveToStore(DB_NAME);
  return db;
}

function parseRow(row) {
  const out = { ...row };
  for (const k of Object.keys(out)) {
    if (JSON_COLS.has(k) && typeof out[k] === 'string') {
      try { out[k] = JSON.parse(out[k]); } catch { out[k] = []; }
    }
  }
  return out;
}

// Query helpers ------------------------------------------------------------

export async function query(sql, values = []) {
  await initDb();
  const res = await db.query(sql, values);
  return (res.values || []).map(parseRow);
}

export async function run(sql, values = []) {
  await initDb();
  const res = await db.run(sql, values);
  if (Capacitor.getPlatform() === 'web') await sqlite.saveToStore(DB_NAME);
  return res;
}

// Stringify any JSON-bound fields on an object before persisting.
export function prepForWrite(obj, cols) {
  const out = {};
  for (const c of cols) {
    const v = obj[c];
    out[c] = JSON_COLS.has(c) && v != null && typeof v !== 'string'
      ? JSON.stringify(v)
      : (v ?? null);
  }
  return out;
}

// Generic upsert by primary key `id`.
export async function upsert(table, obj, cols) {
  const data = prepForWrite(obj, cols);
  const placeholders = cols.map(() => '?').join(', ');
  const updates = cols.filter((c) => c !== 'id').map((c) => `${c}=excluded.${c}`).join(', ');
  await run(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})
     ON CONFLICT(id) DO UPDATE SET ${updates}`,
    cols.map((c) => data[c]),
  );
}

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
