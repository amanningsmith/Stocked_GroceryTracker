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
import { getApiEnabled, logApiCall } from '../lib/apiUsage';

const BASE = 'https://api.spoonacular.com';

async function apiKey() {
  const { value } = await Preferences.get({ key: 'spoonacular_key' });
  if (!value) throw new Error('No Spoonacular API key set. Add one in Settings.');
  return value;
}

// Returns { data, quotaUsed, quotaLeft } so callers can log quota per call.
// Quota header names verified against Spoonacular API docs; fall back to null if absent.
async function get(path, params = {}) {
  const key = await apiKey();
  const qs = new URLSearchParams({ ...params, apiKey: key }).toString();
  const res = await fetch(`${BASE}${path}?${qs}`);
  if (res.status === 402) throw new Error('Spoonacular daily quota reached (free tier).');
  if (!res.ok) throw new Error(`Spoonacular ${res.status}: ${res.statusText}`);
  const data = await res.json();
  return {
    data,
    quotaUsed: Number(res.headers.get('X-API-Quota-Used')) || null,
    quotaLeft: Number(res.headers.get('X-API-Quota-Left')) || null,
  };
}

// ---- Finder search (MVP1). Maps our filter UI to complexSearch params. ----
// filters: { query, protein, cuisine, method, maxTime, diet, mealType, number, offset }
export async function searchRecipes(filters = {}) {
  if (!(await getApiEnabled('spoonacular'))) {
    throw new Error('Spoonacular API is turned off in Settings → API Controls.');
  }

  const params = {
    number: filters.number ?? 100,
    offset: filters.offset ?? 0,
    addRecipeInformation: true,
    fillIngredients: true,
  };
  if (filters.query) params.query = filters.query;
  if (filters.cuisine) params.cuisine = filters.cuisine;
  if (filters.diet) params.diet = filters.diet;
  if (filters.mealType) params.type = filters.mealType;
  if (filters.maxTime) params.maxReadyTime = filters.maxTime;
  const incl = [filters.protein, filters.ingredient].filter(Boolean);
  if (incl.length) params.includeIngredients = incl.join(',');

  let result;
  try {
    result = await get('/recipes/complexSearch', params);
  } catch (err) {
    await logApiCall({ provider: 'spoonacular', endpoint: 'complexSearch', ok: false, note: err.message?.slice(0, 200) });
    throw err;
  }
  const { data, quotaUsed, quotaLeft } = result;
  await logApiCall({ provider: 'spoonacular', endpoint: 'complexSearch', quotaUsed, quotaLeft, ok: true });

  return {
    results: (data.results || []).map(normalizeSearchResult),
    total: data.totalResults || 0,
  };
}

// ---- Fetch just the image URL for an imported recipe by searching its name.
//      Costs 1 quota point; caller should only invoke when recipe.image is null. ----
export async function fetchImageForName(name) {
  try {
    if (!(await getApiEnabled('spoonacular'))) return null;
    const { data, quotaUsed, quotaLeft } = await get('/recipes/complexSearch', { query: name, number: 1 });
    await logApiCall({ provider: 'spoonacular', endpoint: 'complexSearch/imageByName', quotaUsed, quotaLeft, ok: true });
    return data.results?.[0]?.image || null;
  } catch {
    return null;
  }
}

// ---- Full recipe with ingredients + analyzed instructions (detail/cooking). ----
export async function getRecipe(id) {
  if (!(await getApiEnabled('spoonacular'))) {
    throw new Error('Spoonacular API is turned off in Settings → API Controls.');
  }

  let infoResult, analyzedResult;
  try {
    infoResult = await get(`/recipes/${id}/information`, { includeNutrition: false });
  } catch (err) {
    await logApiCall({ provider: 'spoonacular', endpoint: 'information', ok: false, note: err.message?.slice(0, 200) });
    throw err;
  }
  await logApiCall({ provider: 'spoonacular', endpoint: 'information', quotaUsed: infoResult.quotaUsed, quotaLeft: infoResult.quotaLeft, ok: true });

  try {
    analyzedResult = await get(`/recipes/${id}/analyzedInstructions`, {});
  } catch (err) {
    await logApiCall({ provider: 'spoonacular', endpoint: 'analyzedInstructions', ok: false, note: err.message?.slice(0, 200) });
    throw err;
  }
  await logApiCall({ provider: 'spoonacular', endpoint: 'analyzedInstructions', quotaUsed: analyzedResult.quotaUsed, quotaLeft: analyzedResult.quotaLeft, ok: true });

  return normalizeRecipe(infoResult.data, analyzedResult.data);
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

function normalizeSearchResult(r) {
  const ingredients = (r.extendedIngredients || []).map((i) => ({
    name: i.nameClean || i.name,
    amount: i.measures?.us?.amount ?? i.amount ?? null,
    unit: i.measures?.us?.unitShort ?? i.unit ?? '',
    section: aisleToSection(i.aisle),
    isStaple: false,
  }));
  const ingNames = ingredients.length
    ? ingredients.map((i) => i.name)
    : (r.missedIngredients || []).map((i) => i.name);
  return {
    id: `sp_${r.id}`,
    source: 'spoonacular',
    name: r.title,
    image: r.image || null,
    cuisine: (r.cuisines && r.cuisines[0]) || 'Other',
    method: (r.dishTypes && r.dishTypes[0]) || 'unknown',
    totalTimeMinutes: r.readyInMinutes || null,
    protein: ingNames.find((n) => /chicken|beef|pork|fish|tofu|shrimp|turkey|lamb/i.test(n)) || '',
    dietaryTags: dietaryTags(r),
    difficulty: 'medium',
    servings: r.servings || 2,
    description: r.summary ? r.summary.replace(/<[^>]+>/g, '') : '',
    tip: '',
    macroContributors: ingNames.slice(0, 5),
    ingredients,
    steps: [],
    cachedAt: Date.now(),
  };
}

function normalizeRecipe(info, analyzed) {
  const ingredients = (info.extendedIngredients || []).map((i) => ({
    name: i.nameClean || i.name,
    amount: i.measures?.us?.amount ?? i.amount ?? null,
    unit: i.measures?.us?.unitShort ?? i.unit ?? '',
    section: aisleToSection(i.aisle),
    isStaple: false,
  }));

  const steps = [];
  for (const block of analyzed || []) {
    for (const s of block.steps || []) {
      steps.push({
        number: s.number,
        instruction: s.step,
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
    tip: '',
    macroContributors: ingredients.map((i) => i.name).slice(0, 5),
    ingredients,
    steps,
    cachedAt: Date.now(),
  };
}
