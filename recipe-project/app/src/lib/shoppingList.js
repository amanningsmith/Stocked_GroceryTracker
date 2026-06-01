// Shopping-list generation (spec MVP3).
// Build from every recipe attached to a week: merge same-ingredient amounts,
// scale by per-meal servings, group by store section, and split staples
// ("probably have") out from the must-buy list.
//
// v1 ships with a STATIC staples flag (ingredient.isStaple from the recipe data).
// The learning pantry (§5) layers on top of this later — see GAPS.md.

import { sectionRank } from './sections';

// Merge key: same name + same unit can be summed. Different units stay as
// separate lines (we don't convert cups<->grams etc. in v1 — noted in GAPS).
function mergeKey(name, unit) {
  return `${name.trim().toLowerCase()}|${(unit || '').trim().toLowerCase()}`;
}

// recipesWithServings: [{ recipe, servings }]
// Scales each ingredient amount by (servings / recipe.servings).
export function buildShoppingLines(recipesWithServings) {
  const merged = new Map();

  for (const { recipe, servings } of recipesWithServings) {
    const baseServings = recipe.servings || 1;
    const scale = (servings || baseServings) / baseServings;

    for (const ing of recipe.ingredients || []) {
      const key = mergeKey(ing.name, ing.unit);
      const qty = (Number(ing.amount) || 0) * scale;

      if (!merged.has(key)) {
        merged.set(key, {
          name: ing.name,
          mergedQty: 0,
          unit: ing.unit || '',
          section: ing.section || 'Other',
          isStaple: !!ing.isStaple,
          fromRecipes: new Set(),
          source: 'recipe',
        });
      }
      const line = merged.get(key);
      line.mergedQty += qty;
      line.fromRecipes.add(recipe.name);
      // If any contributing recipe marks it non-staple, treat as a real buy.
      if (!ing.isStaple) line.isStaple = false;
    }
  }

  return [...merged.values()].map((l) => ({
    ...l,
    mergedQty: Math.round(l.mergedQty * 100) / 100,
    fromRecipes: [...l.fromRecipes],
    status: l.isStaple ? 'have' : 'need', // staples default to "probably have"
  }));
}

// Group lines into ordered sections for display.
export function groupBySection(lines) {
  const groups = {};
  for (const l of lines) (groups[l.section] ||= []).push(l);
  return Object.entries(groups)
    .sort(([a], [b]) => sectionRank(a) - sectionRank(b))
    .map(([section, items]) => ({
      section,
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

// Plain-text export for Notes / Messages (spec MVP3 export targets).
export function listToText(grouped, { onlyNeeded = true } = {}) {
  const out = ['Shopping list', ''];
  for (const { section, items } of grouped) {
    const show = onlyNeeded ? items.filter((i) => i.status === 'need') : items;
    if (!show.length) continue;
    out.push(section);
    for (const i of show) {
      const qty = i.mergedQty ? `${i.mergedQty}${i.unit ? ' ' + i.unit : ''} ` : '';
      out.push(`  - ${qty}${i.name}`);
    }
    out.push('');
  }
  return out.join('\n').trim();
}
