import { Capacitor } from '@capacitor/core';
import { query, run } from './db';

const JSON_COLS = new Set([
  'dietaryTags', 'macroContributors', 'ingredients', 'steps',
  'fromRecipes', 'photos', 'customIngredients',
]);

function stringifyJsonCols(row) {
  const out = { ...row };
  for (const k of Object.keys(out)) {
    if (JSON_COLS.has(k) && out[k] != null && typeof out[k] !== 'string') {
      out[k] = JSON.stringify(out[k]);
    }
  }
  return out;
}

async function insertRows(table, rows) {
  for (const row of rows) {
    const prepared = stringifyJsonCols(row);
    const cols = Object.keys(prepared);
    const vals = cols.map((c) => prepared[c]);
    const placeholders = cols.map(() => '?').join(', ');
    await run(
      `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
      vals,
    );
  }
}

export async function exportBackup() {
  const [recipes, favorites, weeks, meals, shopping, pantry, cookLogs] = await Promise.all([
    query('SELECT * FROM recipe'),
    query('SELECT * FROM favorite'),
    query('SELECT * FROM week'),
    query('SELECT * FROM meal_entry'),
    query('SELECT * FROM shopping_line'),
    query('SELECT * FROM pantry_item'),
    query('SELECT * FROM cook_log'),
  ]);

  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tables: { recipes, favorites, weeks, meals, shopping, pantry, cookLogs },
  };

  const json = JSON.stringify(backup, null, 2);
  const filename = `stocked-backup-${new Date().toISOString().slice(0, 10)}.json`;

  if (Capacitor.getPlatform() === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    const file = new File([json], filename, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Stocked Backup' });
    } else {
      // Fallback: share as plain text (e.g. paste into Drive/Notes)
      await navigator.share({ text: json, title: 'Stocked Backup' });
    }
  }
}

export async function importBackup(json) {
  const backup = typeof json === 'string' ? JSON.parse(json) : json;
  if (!backup?.tables) throw new Error('Invalid backup file');

  const { recipes = [], favorites = [], weeks = [], meals = [],
          shopping = [], pantry = [], cookLogs = [] } = backup.tables;

  // Clear then re-insert so IDs stay consistent and there are no duplicates.
  await run('DELETE FROM cook_log');
  await run('DELETE FROM shopping_line');
  await run('DELETE FROM meal_entry');
  await run('DELETE FROM favorite');
  await run('DELETE FROM week');
  await run('DELETE FROM recipe');
  await run('DELETE FROM pantry_item');

  await insertRows('recipe', recipes);
  await insertRows('favorite', favorites);
  await insertRows('week', weeks);
  await insertRows('meal_entry', meals);
  await insertRows('shopping_line', shopping);
  await insertRows('pantry_item', pantry);
  await insertRows('cook_log', cookLogs);
}
