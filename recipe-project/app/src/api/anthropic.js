import { CapacitorHttp } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

// System prompt for recipe generation.
//
// Closed enums (validator enforces these — wrong values block import):
//   difficulty: easy | medium | hard
//   ingredient section: Produce | Meat & Seafood | Dairy | Bakery |
//                       Dry & Canned | Spices | Frozen | Other
//
// Recommended (not validated as closed — but matching these lets the
// Finder's filter chips work correctly for generated recipes):
//   cuisine: Italian Mexican Indian Chinese Thai Japanese Mediterranean
//            American French Greek Korean
//   protein: chicken beef pork fish shrimp tofu turkey lamb seafood
//            vegetarian vegan
//   method:  bake grill sauté roast slow\ cook stir\ fry skillet oven
//            simmer wok braise
//   dietaryTags subset of: vegetarian vegan gluten\ free dairy\ free low-carb
//
// If RECIPE_IMPORT_FORMAT.md enums change, update the SYSTEM constant below
// to match — it is the single source of the generation contract.
const SYSTEM = `You generate recipes as JSON for a personal recipe app.
Output ONLY a JSON array of recipe objects. No markdown, no code fences, no commentary before or after the array.

Each recipe object has EXACTLY these fields (no extras, no "source" field):
- name: string
- cuisine: string — prefer one of: Italian, Mexican, Indian, Chinese, Thai, Japanese, Mediterranean, American, French, Greek, Korean
- method: string — prefer one of: bake, grill, sauté, roast, slow cook, stir fry, skillet, oven, simmer, wok, braise
- totalTimeMinutes: number
- servings: number (default 2, max 4)
- protein: string — prefer one of: chicken, beef, pork, fish, shrimp, tofu, turkey, lamb, seafood, vegetarian, vegan
- dietaryTags: string[] — subset of: vegetarian, vegan, gluten free, dairy free, low-carb. Use [] if none apply.
- difficulty: string — MUST be exactly one of: easy, medium, hard (this is validated strictly)
- macroContributors: string[] — the 2–5 headline ingredients (e.g. chicken, pasta — NOT spices or staples)
- description: string — 1–2 sentences, appetising
- ingredients: array of objects with fields:
    name: string (unique within the recipe, used for step cross-referencing)
    amount: number (decimal, never a fraction string — e.g. 0.5 not "1/2")
    unit: string — use imperial units; prefer one of: g, kg, oz, lb, ml, l, tsp, tbsp, cup, clove, whole, pinch, "" (empty string for countable items like 2 eggs)
    section: string — MUST be exactly one of: Produce, Meat & Seafood, Dairy, Bakery, Dry & Canned, Spices, Frozen, Other (this is validated strictly)
    isStaple: boolean — true for pantry staples (salt, oil, common spices), false for items you'd shop for
- steps: array of objects with fields:
    number: number (1-indexed)
    instruction: string
    ingredientRefs: string[] — CRITICAL: every string here MUST exactly match (same spelling and case) a name in this recipe's ingredients array. This drives cooking-mode highlighting. An unmatched ref is a fatal import error.
- tip: string — one pro tip, or "" if none`;

export async function generateRecipes(userPrompt, count = 1) {
  const { value: key } = await Preferences.get({ key: 'anthropic_key' });
  if (!key?.trim()) throw new Error('No Anthropic API key set — add one in Settings → Claude AI.');

  const { value: model } = await Preferences.get({ key: 'anthropic_model' });
  const activeModel = model || DEFAULT_MODEL;

  // Scale token budget with recipe count. ~1.2K output tokens per recipe
  // plus headroom for the system + user prompts.
  const maxTokens = 512 + count * 1400;

  const res = await CapacitorHttp.post({
    url: ENDPOINT,
    headers: {
      'content-type': 'application/json',
      'x-api-key': key.trim(),
      'anthropic-version': '2023-06-01',
      // Allows the call to succeed from a browser (web dev) without a proxy.
      // Harmless on native Android where CORS doesn't apply.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    data: {
      model: activeModel,
      max_tokens: maxTokens,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Generate ${count} recipe${count === 1 ? '' : 's'}: ${userPrompt}`,
        },
        {
          // Prefill forces the model's response to start inside the JSON array,
          // eliminating any preamble text. We re-prepend '[' before parsing.
          role: 'assistant',
          content: '[',
        },
      ],
    },
  });

  if (res.status >= 400) {
    const msg = res.data?.error?.message || JSON.stringify(res.data);
    throw new Error(`Anthropic API error ${res.status}: ${msg}`);
  }

  // CapacitorHttp auto-parses JSON response bodies into res.data.
  const text = (res.data?.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  // Re-attach the prefilled '[', strip any stray code fences, then parse.
  const raw = ('[' + text).replace(/```json|```/g, '').trim();

  let recipes;
  try {
    recipes = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Model returned malformed JSON: ${e.message}\n\nRaw output:\n${raw.slice(0, 400)}`);
  }

  if (!Array.isArray(recipes)) throw new Error('Model response was not a JSON array.');
  return recipes;
}
