# Recipe Import Format (v1)

**Purpose:** A fixed JSON shape so any AI-generated recipe imports cleanly into the app — same structure the Spoonacular path produces internally, so both sources behave identically.

**Owner:** Manning · **Pairs with:** `RECIPE_APP_MVP_REQUIREMENTS_v2.md`

---

## The Schema

```json
{
  "name": "string — recipe title",
  "source": "imported",
  "cuisine": "string — e.g. Italian, Mexican, Thai",
  "method": "string — primary cooking method (Skillet, Oven, Grill, Simmer, Wok, Braise...)",
  "totalTimeMinutes": 0,
  "servings": 0,
  "protein": "string — main protein (chicken, beef, pork, seafood, vegetarian, vegan)",
  "dietaryTags": ["string — e.g. gluten-free, dairy-free, low-carb (omit if none)"],
  "difficulty": "easy | medium | hard",
  "macroContributors": ["string — the 2–5 headline protein/carb ingredients shown on the card, e.g. chicken thighs, pasta"],
  "description": "string — 1–2 sentence description",
  "ingredients": [
    {
      "name": "string — must be unique within the recipe; step refs match this exactly",
      "amount": 0,
      "unit": "string — g, kg, oz, lb, ml, l, tsp, tbsp, cup, clove, whole, pinch, or \"\" for countable items",
      "section": "Produce | Meat & Seafood | Dairy | Bakery | Dry & Canned | Spices | Frozen | Other",
      "isStaple": true
    }
  ],
  "steps": [
    {
      "number": 1,
      "instruction": "string — one clear step",
      "ingredientRefs": ["string — exact ingredient names used in this step (drives the cooking-screen highlighting)"]
    }
  ],
  "tip": "string — one pro tip (optional, use \"\" if none)"
}
```

### Field rules that matter
- **`source`** is always the literal string `"imported"`.
- **`macroContributors`** = the protein + carb headliners only (e.g. `["chicken thighs", "pasta"]`) — not spices or aromatics. This is what shows on the recipe card.
- **`section`** must be one of the seven enum values exactly — this is what groups the shopping list by store aisle.
- **`isStaple`** = `true` for pantry items you usually keep on hand (oil, salt, common spices, sugar, flour, soy sauce). This is what splits the shopping list into "probably have" vs "need to buy."
- **`ingredientRefs`** must match `ingredients[].name` **character-for-character** — that's how the cooking screen highlights the right ingredients per step.
- All `amount` values are numbers (use `0.5`, not `"½"`). Countable items (e.g. 2 eggs) use `unit: ""`.

---

## Worked Example

```json
{
  "name": "Creamy Tomato Chicken Pasta",
  "source": "imported",
  "cuisine": "Italian",
  "method": "Skillet",
  "totalTimeMinutes": 30,
  "servings": 4,
  "protein": "chicken",
  "dietaryTags": [],
  "difficulty": "easy",
  "macroContributors": ["chicken breast", "penne pasta"],
  "description": "Seared chicken in a silky tomato-cream sauce tossed with penne. A fast, crowd-pleasing weeknight skillet dinner.",
  "ingredients": [
    { "name": "chicken breast", "amount": 1, "unit": "lb", "section": "Meat & Seafood", "isStaple": false },
    { "name": "penne pasta", "amount": 12, "unit": "oz", "section": "Dry & Canned", "isStaple": false },
    { "name": "crushed tomatoes", "amount": 14, "unit": "oz", "section": "Dry & Canned", "isStaple": false },
    { "name": "heavy cream", "amount": 0.5, "unit": "cup", "section": "Dairy", "isStaple": false },
    { "name": "garlic", "amount": 3, "unit": "clove", "section": "Produce", "isStaple": false },
    { "name": "olive oil", "amount": 2, "unit": "tbsp", "section": "Spices", "isStaple": true },
    { "name": "salt", "amount": 1, "unit": "tsp", "section": "Spices", "isStaple": true },
    { "name": "black pepper", "amount": 0.5, "unit": "tsp", "section": "Spices", "isStaple": true },
    { "name": "parmesan", "amount": 0.5, "unit": "cup", "section": "Dairy", "isStaple": false }
  ],
  "steps": [
    { "number": 1, "instruction": "Boil the penne in salted water until al dente, then drain.", "ingredientRefs": ["penne pasta", "salt"] },
    { "number": 2, "instruction": "Season and sear the chicken in olive oil over high heat until golden, then slice.", "ingredientRefs": ["chicken breast", "olive oil", "salt", "black pepper"] },
    { "number": 3, "instruction": "Soften the garlic, add crushed tomatoes and cream, and simmer 5 minutes.", "ingredientRefs": ["garlic", "crushed tomatoes", "heavy cream"] },
    { "number": 4, "instruction": "Toss the pasta and chicken into the sauce, finish with parmesan.", "ingredientRefs": ["penne pasta", "chicken breast", "parmesan"] }
  ],
  "tip": "Salt the pasta water generously — it's your only chance to season the pasta itself."
}
```

---

## Prompt to Give Your AI

> Generate a complete recipe for **[DISH NAME]** (serves [N]).
>
> Return **only** a single valid JSON object — no markdown, no code fences, no text before or after. It must match this exact schema and rules:
>
> - Keys, in order: `name, source, cuisine, method, totalTimeMinutes, servings, protein, dietaryTags, difficulty, macroContributors, description, ingredients, steps, tip`.
> - `source` is always `"imported"`.
> - `macroContributors`: only the 2–5 main protein/carb ingredients (no spices/aromatics).
> - Each ingredient has `name` (unique), `amount` (number — use decimals like 0.5, never fractions), `unit` (g, kg, oz, lb, ml, l, tsp, tbsp, cup, clove, whole, pinch, or "" for countable items), `section` (exactly one of: Produce, Meat & Seafood, Dairy, Bakery, Dry & Canned, Spices, Frozen, Other), and `isStaple` (true for common pantry items like oil, salt, sugar, flour, common spices).
> - Each step has `number`, `instruction`, and `ingredientRefs` — an array of ingredient names used in that step that match the `ingredients` names **exactly**.
> - `difficulty` is one of: easy, medium, hard. Use `""` for `tip` if none and `[]` for `dietaryTags` if none.

Fill in the dish and servings, paste the JSON it returns into the app's **Import** screen, and it'll validate against this schema on the way in.
