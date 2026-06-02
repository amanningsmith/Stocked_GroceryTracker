// Import validator — reconciled against RECIPE_IMPORT_FORMAT.md (v1).
// Enforces the schema rules; returns fatal `errors` (block import) and soft
// `warnings` (import allowed, but surfaced) so good-enough AI output isn't
// rejected over cosmetic issues.

// Section enum — the format doc says "seven" but lists EIGHT (matches spec §MVP3).
// Eight is correct; the "seven" is a typo in the format doc.
const SECTIONS = ['Produce', 'Meat & Seafood', 'Dairy', 'Bakery', 'Dry & Canned', 'Spices', 'Frozen', 'Other'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
// Canonical units from the format doc ("" = countable item, e.g. 2 eggs).
const UNITS = new Set(['g', 'kg', 'oz', 'lb', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'clove', 'whole', 'pinch', '']);

const norm = (s) => String(s).trim().toLowerCase();

export function validateImport(raw) {
  const errors = [];
  const warnings = [];
  let data;
  try {
    data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    return { ok: false, errors: ['Not valid JSON: ' + e.message], warnings: [], recipe: null };
  }

  const req = (cond, msg) => { if (!cond) errors.push(msg); };
  const warn = (cond, msg) => { if (!cond) warnings.push(msg); };
  const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
  const isNum = (v) => typeof v === 'number' && !Number.isNaN(v);

  // ---- Top-level fields ----
  req(isStr(data.name), 'name: required string');
  // source will be added by ImportScreen, not required in input JSON
  req(isStr(data.cuisine), 'cuisine: required string');
  req(isStr(data.method), 'method: required string (e.g. Skillet, Oven, Grill)');
  req(isNum(data.totalTimeMinutes), 'totalTimeMinutes: required number');
  req(isNum(data.servings), 'servings: required number');
  req(isStr(data.protein), 'protein: required string');
  req(Array.isArray(data.dietaryTags), 'dietaryTags: required array (use [] if none)');
  req(DIFFICULTIES.includes(data.difficulty), `difficulty: one of ${DIFFICULTIES.join(' / ')}`);
  req(isStr(data.description), 'description: required string');

  // macroContributors: doc says 2-5 protein/carb headliners (non-fatal on count).
  req(Array.isArray(data.macroContributors), 'macroContributors: required array');
  if (Array.isArray(data.macroContributors)) {
    warn(data.macroContributors.length >= 2 && data.macroContributors.length <= 5,
      `macroContributors: expected 2-5 headline ingredients (got ${data.macroContributors.length})`);
  }
  // tip is optional ("" if none) but the key should be present.
  warn('tip' in data, 'tip: key missing (use "" if no tip)');

  // ---- Ingredients ----
  const ingredientNames = new Set();
  if (!Array.isArray(data.ingredients) || data.ingredients.length === 0) {
    errors.push('ingredients: required non-empty array');
  } else {
    data.ingredients.forEach((ing, i) => {
      const at = `ingredients[${i}]`;
      if (!isStr(ing.name)) { errors.push(`${at}.name: required`); return; }
      if (ingredientNames.has(norm(ing.name))) errors.push(`${at}.name: "${ing.name}" is duplicated (names must be unique)`);
      ingredientNames.add(norm(ing.name));
      if (!isNum(ing.amount)) errors.push(`${at}.amount: required number (use 0.5, not "1/2")`);
      if (ing.section == null || !SECTIONS.includes(ing.section)) errors.push(`${at}.section: must be one of ${SECTIONS.join(', ')}`);
      warn(typeof ing.unit === 'string' && UNITS.has(ing.unit), `${at}.unit: "${ing.unit}" not in the canonical list (${[...UNITS].filter(Boolean).join(', ')})`);
      warn(typeof ing.isStaple === 'boolean', `${at}.isStaple: should be a boolean (defaulting to false)`);
    });
  }

  // ---- Steps + the critical ingredientRefs <-> ingredient name match ----
  if (!Array.isArray(data.steps) || data.steps.length === 0) {
    errors.push('steps: required non-empty array');
  } else {
    data.steps.forEach((s, i) => {
      const at = `steps[${i}]`;
      if (!isNum(s.number)) errors.push(`${at}.number: required number`);
      if (!isStr(s.instruction)) errors.push(`${at}.instruction: required`);
      if (s.ingredientRefs != null && !Array.isArray(s.ingredientRefs)) {
        errors.push(`${at}.ingredientRefs: must be an array`);
      } else {
        for (const ref of s.ingredientRefs || []) {
          // Must reference a real ingredient - this powers cooking-mode highlighting.
          if (!ingredientNames.has(norm(ref))) {
            errors.push(`${at}.ingredientRefs: "${ref}" doesn't match any ingredient name`);
          } else if (!data.ingredients.some((ing) => ing.name === ref)) {
            // Matches case-insensitively but not character-for-character.
            warnings.push(`${at}.ingredientRefs: "${ref}" differs in case/spacing from the ingredient name`);
          }
        }
      }
    });
  }

  return { ok: errors.length === 0, errors, warnings, recipe: errors.length === 0 ? data : null };
}
