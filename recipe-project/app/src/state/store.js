// Data-access / repository layer. Screens call these instead of touching SQL.
import { query, run, upsert, uid } from '../db/db';

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
  // Delete recipe and any associated favorites/meals
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
export async function addMeal({ weekId, date, slot, recipeId, servings = 2 }) {
  const id = uid('meal');
  await run(
    `INSERT INTO meal_entry (id, weekId, date, slot, recipeId, servings) VALUES (?,?,?,?,?,?)`,
    [id, weekId, date, slot, recipeId, Math.min(servings, 4)],
  );
  return id;
}
export async function removeMeal(id) {
  await run('DELETE FROM meal_entry WHERE id = ?', [id]);
}
export async function updateMealServings(id, servings) {
  await run('UPDATE meal_entry SET servings = ? WHERE id = ?', [Math.min(servings, 4), id]);
}
export async function mealsForWeek(weekId) {
  return query('SELECT * FROM meal_entry WHERE weekId = ? ORDER BY date, slot', [weekId]);
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
