// Spoonacular client + normalization layer (spec §2).
// Both Spoonacular and imported recipes are mapped into ONE recipe shape so
// they're indistinguishable downstream (same card, shopping logic, cooking screen).
//
// Endpoints used:
//   - complexSearch        : filterable finder results (MVP1)
//   - information (bulk)    : full recipe + extendedIngredients (aisle data -> section)
//   - analyzedInstructions : per-step ingredients (cooking-mode highlighting, MVP6)
//
// Fetched recipes are cached into SQLite by the caller to protect the free-tier quota.

import { Preferences } from '@capacitor/preferences';
import { aisleToSection } from '../lib/sections';

const BASE = 'https://api.spoonacular.com';

async function apiKey() {
  const { value } = await Preferences.get({ key: 'spoonacular_key' });
  if (!value) throw new Error('No Spoonacular API key set. Add one in Settings.');
  return value;
}

async function get(path, params = {}) {
  const key = await apiKey();
  const qs = new URLSearchParams({ ...params, apiKey: key }).toString();
  const res = await fetch(`${BASE}${path}?${qs}`);
  if (res.status === 402) throw new Error('Spoonacular daily quota reached (free tier).');
  if (!res.ok) throw new Error(`Spoonacular ${res.status}: ${res.statusText}`);
  return res.json();
}

// ---- Finder search (MVP1). Maps our filter UI to complexSearch params. ----
// filters: { query, protein, cuisine, method, maxTime, diet, mealType, number, offset }
export async function searchRecipes(filters = {}) {
  const params = {
    number: filters.number ?? 100,            // load 100, +100 per page (spec)
    offset: filters.offset ?? 0,
    addRecipeInformation: true,
    fillIngredients: true,
  };
  if (filters.query) params.query = filters.query;
  if (filters.cuisine) params.cuisine = filters.cuisine;
  if (filters.diet) params.diet = filters.diet;
  if (filters.mealType) params.type = filters.mealType;
  if (filters.maxTime) params.maxReadyTime = filters.maxTime;
  // protein/meat type + ingredient search both ride includeIngredients.
  const incl = [filters.protein, filters.ingredient].filter(Boolean);
  if (incl.length) params.includeIngredients = incl.join(',');

  const data = await get('/recipes/complexSearch', params);
  return {
    results: (data.results || []).map(normalizeSearchResult),
    total: data.totalResults || 0,
  };
}

// ---- Full recipe with ingredients + analyzed instructions (detail/cooking). ----
export async function getRecipe(id) {
  const info = await get(`/recipes/${id}/information`, { includeNutrition: false });
  const analyzed = await get(`/recipes/${id}/analyzedInstructions`, {});
  return normalizeRecipe(info, analyzed);
}

// ---- Normalizers ---------------------------------------------------------

function dietaryTags(r) {
  const tags = [];
  if (r.vegetarian) tags.push('vegetarian');
  if (r.vegan) tags.push('vegan');
  if (r.glutenFree) tags.push('gluten-free');
  if (r.dairyFree) tags.push('dairy-free');
  return tags;
}

// Lightweight shape from complexSearch (enough for the finder card).
function normalizeSearchResult(r) {
  const ings = (r.extendedIngredients || r.missedIngredients || []).map((i) => i.name);
  return {
    id: `sp_${r.id}`,
    source: 'spoonacular',
    name: r.title,
    image: r.image || null,
    cuisine: (r.cuisines && r.cuisines[0]) || 'Other',
    method: 'unknown',
    totalTimeMinutes: r.readyInMinutes || null,
    protein: ings.find((n) => /chicken|beef|pork|fish|tofu|shrimp|turkey|lamb/i.test(n)) || '',
    dietaryTags: dietaryTags(r),
    difficulty: 'medium',
    servings: r.servings || 2,
    // top headline ingredients for the card (protein/carb, not spices) — best effort
    macroContributors: ings.slice(0, 5),
    ingredients: [],
    steps: [],
    cachedAt: Date.now(),
  };
}

// Full normalize using /information + /analyzedInstructions.
function normalizeRecipe(info, analyzed) {
  const ingredients = (info.extendedIngredients || []).map((i) => ({
    name: i.nameClean || i.name,
    amount: i.measures?.us?.amount ?? i.amount ?? null,
    unit: i.measures?.us?.unitShort ?? i.unit ?? '',
    section: aisleToSection(i.aisle),
    isStaple: false, // Spoonacular has no staple flag; pantry layer refines later
  }));

  const steps = [];
  for (const block of analyzed || []) {
    for (const s of block.steps || []) {
      steps.push({
        number: s.number,
        instruction: s.step,
        // per-step ingredients power cooking-mode highlighting (MVP6)
        ingredientRefs: (s.ingredients || []).map((x) => x.name),
      });
    }
  }

  return {
    id: `sp_${info.id}`,
    source: 'spoonacular',
    name: info.title,
    image: info.image || null,
    cuisine: (info.cuisines && info.cuisines[0]) || 'Other',
    method: (info.dishTypes && info.dishTypes[0]) || 'unknown',
    totalTimeMinutes: info.readyInMinutes || null,
    protein: ingredients.map((i) => i.name).find((n) => /chicken|beef|pork|fish|tofu|shrimp|turkey|lamb/i.test(n)) || '',
    dietaryTags: dietaryTags(info),
    difficulty: 'medium',
    servings: info.servings || 2,
    description: info.summary ? info.summary.replace(/<[^>]+>/g, '') : '',
    tip: '', // Spoonacular has no equivalent; kept for shape parity with imports
    macroContributors: ingredients.map((i) => i.name).slice(0, 5),
    ingredients,
    steps,
    cachedAt: Date.now(),
  };
}
