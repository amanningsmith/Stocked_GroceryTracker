// Sort-by-shared-ingredients (spec MVP5).
// Rank candidate recipes by % ingredient overlap against the recipes already
// in the current week. Pantry staples are ignored so matches reflect real
// shopping savings (weighted toward perishables).

function nameSet(recipe, { ignoreStaples = true } = {}) {
  const s = new Set();
  for (const ing of recipe.ingredients || []) {
    if (ignoreStaples && ing.isStaple) continue;
    s.add(ing.name.trim().toLowerCase());
  }
  return s;
}

// Pool of non-staple ingredient names already committed to the week.
export function weekIngredientPool(weekRecipes) {
  const pool = new Set();
  for (const r of weekRecipes) for (const n of nameSet(r)) pool.add(n);
  return pool;
}

// Overlap score for one candidate against the week pool: fraction of the
// candidate's perishable ingredients already being bought this week.
export function overlapScore(candidate, pool) {
  const ing = nameSet(candidate);
  if (ing.size === 0 || pool.size === 0) return 0;
  let shared = 0;
  for (const n of ing) if (pool.has(n)) shared += 1;
  return shared / ing.size;
}

export function sortByOverlap(candidates, weekRecipes) {
  const pool = weekIngredientPool(weekRecipes);
  return [...candidates]
    .map((r) => ({ recipe: r, score: overlapScore(r, pool) }))
    .sort((a, b) => b.score - a.score);
}
