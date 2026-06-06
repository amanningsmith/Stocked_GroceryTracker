// Data-access / repository layer. Screens call these instead of touching SQL.
import { query, run, upsert, uid } from '../db/db';
import { Preferences } from '@capacitor/preferences';
import { scheduleForEntry, cancelForEntry, cancelForEntryIds } from '../lib/thawReminders';

const RECIPE_COLS = [
  'id', 'source', 'name', 'image', 'cuisine', 'method', 'totalTimeMinutes',
  'protein', 'dietaryTags', 'difficulty', 'servings', 'macroContributors',
  'description', 'tip', 'ingredients', 'steps', 'cachedAt',
];

// ---- Recipes (cache for Spoonacular + store for imports) ----
export async function saveRecipe(recipe) {
  await upsert('recipe', { cachedAt: Date.now(), ...recipe }, RECIPE_COLS);
  return recipe;
}
export async function getRecipeById(id) {
  const rows = await query('SELECT * FROM recipe WHERE id = ?', [id]);
  return rows[0] || null;
}
export async function listRecipes() {
  return query('SELECT * FROM recipe ORDER BY name');
}
export async function searchLocal(text) {
  const q = `%${text.toLowerCase()}%`;
  // name + ingredient search (MVP1). Ingredients are JSON text, so LIKE on the blob.
  return query(
    `SELECT * FROM recipe WHERE lower(name) LIKE ? OR lower(ingredients) LIKE ? ORDER BY name`,
    [q, q],
  );
}
export async function getImportedRecipes() {
  // Get all recipes with source = 'imported' for feed display
  return query('SELECT * FROM recipe WHERE source = ? ORDER BY name', ['imported']);
}
export async function deleteRecipe(id) {
  // Cancel notifications for every meal entry before the cascade delete.
  try {
    const meals = await query('SELECT id FROM meal_entry WHERE recipeId = ?', [id]);
    await cancelForEntryIds(meals.map(m => m.id));
  } catch {}
  await run('DELETE FROM favorite WHERE recipeId = ?', [id]);
  await run('DELETE FROM meal_entry WHERE recipeId = ?', [id]);
  await run('DELETE FROM recipe WHERE id = ?', [id]);
}

// ---- Favorites ----
export async function toggleFavorite(recipeId, recipe = null) {
  const rows = await query('SELECT recipeId FROM favorite WHERE recipeId = ?', [recipeId]);
  if (rows.length) {
    await run('DELETE FROM favorite WHERE recipeId = ?', [recipeId]);
    return false;
  }
  // When favoriting, cache the full recipe data (if provided) so it can be viewed offline
  if (recipe) {
    await saveRecipe(recipe);
  }
  await run('INSERT INTO favorite (recipeId, addedAt) VALUES (?, ?)', [recipeId, Date.now()]);
  return true;
}
export async function isFavorite(recipeId) {
  const rows = await query('SELECT recipeId FROM favorite WHERE recipeId = ?', [recipeId]);
  return rows.length > 0;
}
export async function listFavorites() {
  return query(
    `SELECT r.* FROM recipe r JOIN favorite f ON f.recipeId = r.id ORDER BY f.addedAt DESC`,
  );
}

// ---- Meal entries ----
async function reminderHour() {
  const { value } = await Preferences.get({ key: 'reminder_hour' });
  return value ? parseInt(value, 10) : 20;
}

export async function addMeal({ weekId, date, slot, recipeId, servings = 2, customTitle = null, customIngredients = null }) {
  const id = uid('meal');
  await run(
    `INSERT INTO meal_entry (id, weekId, date, slot, recipeId, servings, customTitle, customIngredients)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, weekId, date, slot, recipeId, Math.min(servings, 4),
     customTitle, customIngredients ? JSON.stringify(customIngredients) : null],
  );

  // Schedule a thaw reminder if applicable. Non-blocking — a notification
  // failure must never prevent the meal from being saved.
  if (recipeId !== '__custom__') {
    (async () => {
      try {
        const recipe = await getRecipeById(recipeId);
        const entry = { id, date, slot, thawReminder: null, notificationId: null };
        const hour = await reminderHour();
        const notifId = await scheduleForEntry(entry, recipe, { hour });
        if (notifId != null) {
          await run('UPDATE meal_entry SET notificationId = ? WHERE id = ?', [notifId, id]);
        }
      } catch {}
    })();
  }

  return id;
}
export async function removeMeal(id) {
  // Cancel any pending notification before deleting the row.
  try { await cancelForEntry({ id, notificationId: null }); } catch {}
  await run('DELETE FROM meal_entry WHERE id = ?', [id]);
}
export async function updateMealServings(id, servings) {
  await run('UPDATE meal_entry SET servings = ? WHERE id = ?', [Math.min(servings, 4), id]);
}

// Toggle thawReminder override (null → heuristic, 0 → off, 1 → on) and reschedule.
export async function updateMealThawReminder(id, thawReminder, recipe) {
  await run('UPDATE meal_entry SET thawReminder = ? WHERE id = ?', [thawReminder, id]);
  (async () => {
    try {
      const rows = await query('SELECT * FROM meal_entry WHERE id = ?', [id]);
      if (!rows[0]) return;
      const entry = rows[0];
      const hour = await reminderHour();
      const notifId = await scheduleForEntry(entry, recipe, { hour });
      await run('UPDATE meal_entry SET notificationId = ? WHERE id = ?', [notifId ?? null, id]);
    } catch {}
  })();
}
export async function mealsForWeek(weekId) {
  return query('SELECT * FROM meal_entry WHERE weekId = ? ORDER BY date, slot', [weekId]);
}

// Returns shopping-line-shaped objects for all custom meals in a week, so
// regenerate() can include them without losing them on rebuild.
export async function customIngredientsForWeek(weekId) {
  const meals = await query(
    `SELECT customTitle, customIngredients FROM meal_entry WHERE weekId = ? AND recipeId = '__custom__'`,
    [weekId],
  );
  const out = [];
  for (const m of meals) {
    const ings = Array.isArray(m.customIngredients) ? m.customIngredients : [];
    for (const name of ings) {
      if (name?.trim()) {
        out.push({ name: name.trim(), mergedQty: null, unit: '', section: 'Other',
                   status: 'need', fromRecipes: [m.customTitle || 'Custom meal'], source: 'manual' });
      }
    }
  }
  return out;
}

// Append ingredient lines directly to the shopping list (does not replace existing lines).
export async function appendShoppingLines(weekId, names, fromMeal = '') {
  for (const name of names) {
    if (name?.trim()) {
      await run(
        `INSERT INTO shopping_line (id, weekId, name, mergedQty, unit, section, status, fromRecipes, source)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [uid('line'), weekId, name.trim(), null, '', 'Other', 'need', JSON.stringify([fromMeal]), 'manual'],
      );
    }
  }
}

// Recipes attached to a week, paired with their per-meal servings (for shopping/overlap).
export async function weekRecipesWithServings(weekId) {
  const meals = await mealsForWeek(weekId);
  const out = [];
  for (const m of meals) {
    const recipe = await getRecipeById(m.recipeId);
    if (recipe) out.push({ recipe, servings: m.servings, meal: m });
  }
  return out;
}

// ---- Cook logs (MVP4) ----
export async function addCookLog(log) {
  const id = uid('log');
  await run(
    `INSERT INTO cook_log (id, recipeId, dateMade, rating, notes, adjustments, photos)
     VALUES (?,?,?,?,?,?,?)`,
    [id, log.recipeId, log.dateMade, log.rating ?? null, log.notes ?? '', log.adjustments ?? '', JSON.stringify(log.photos || [])],
  );
  return id;
}
export async function logsForRecipe(recipeId) {
  return query('SELECT * FROM cook_log WHERE recipeId = ? ORDER BY dateMade DESC', [recipeId]);
}

// ---- Shopping lines ----
// Add a single shopping line without replacing the rest of the list.
export async function addShoppingLine(weekId, { name, mergedQty = null, unit = '', section = 'Other', source = 'manual', fromRecipes = [] }) {
  await run(
    `INSERT INTO shopping_line (id, weekId, name, mergedQty, unit, section, status, fromRecipes, source)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [uid('line'), weekId, name.trim(), mergedQty || null, unit, section, 'need', JSON.stringify(fromRecipes), source],
  );
}

// Returns shopping-line-shaped objects for pantry items whose restock date
// falls within the given week's date range. Called by regenerate() in ShoppingScreen.
export async function pantryItemsDueInWeek(weekStartDate, weekEndDate) {
  const items = await query(
    `SELECT * FROM pantry_item WHERE lastPurchased IS NOT NULL AND lifespanWeeks IS NOT NULL AND lifespanWeeks > 0`,
  );
  const out = [];
  for (const item of items) {
    // Use noon UTC to avoid DST edge cases when adding fractional weeks.
    const lastMs = new Date(item.lastPurchased + 'T12:00:00Z').getTime();
    const restockMs = lastMs + item.lifespanWeeks * 7 * 24 * 60 * 60 * 1000;
    const restockDate = new Date(restockMs).toISOString().slice(0, 10);
    if (restockDate >= weekStartDate && restockDate <= weekEndDate) {
      out.push({
        name: item.name,
        mergedQty: item.buyQty || null,
        unit: '',
        section: item.section || 'Other',
        status: 'need',
        fromRecipes: [],
        source: 'pantry',
      });
    }
  }
  return out;
}

// Save a new pantry item. lastPurchased is set to today so the restock
// countdown starts immediately.
export async function addPantryItem({ name, section = 'Other', lifespanWeeks = 2, buyQty = null }) {
  await run(
    `INSERT INTO pantry_item (id, name, section, buyQty, lifespanWeeks, lastPurchased, level) VALUES (?,?,?,?,?,?,?)`,
    [uid('pan'), name.trim(), section, buyQty || null, lifespanWeeks,
     new Date().toISOString().slice(0, 10), 1],
  );
}

export async function replaceShoppingLines(weekId, lines) {
  await run('DELETE FROM shopping_line WHERE weekId = ?', [weekId]);
  for (const l of lines) {
    await run(
      `INSERT INTO shopping_line (id, weekId, name, mergedQty, unit, section, status, fromRecipes, source)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [uid('line'), weekId, l.name, l.mergedQty ?? null, l.unit ?? '', l.section ?? 'Other',
       l.status ?? 'need', JSON.stringify(l.fromRecipes || []), l.source ?? 'recipe'],
    );
  }
}
export async function shoppingLinesForWeek(weekId) {
  return query('SELECT * FROM shopping_line WHERE weekId = ?', [weekId]);
}
export async function setLineStatus(id, status) {
  await run('UPDATE shopping_line SET status = ? WHERE id = ?', [status, id]);
}

export { uid };
