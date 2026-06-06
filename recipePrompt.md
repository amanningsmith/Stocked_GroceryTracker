Generate a complete recipe for [DISH NAME] (serves [N]).
Return only a single valid JSON object — no markdown, no code fences, no text before or after. It must match this exact schema and rules:

Keys, in order: name, source, cuisine, method, totalTimeMinutes, servings, protein, dietaryTags, difficulty, macroContributors, description, ingredients, steps, tip.
source is always "imported".
macroContributors: only the 2–5 main protein/carb ingredients (no spices/aromatics).
Each ingredient has name (unique), amount (number — use decimals like 0.5, never fractions), unit (g, kg, oz, lb, ml, l, tsp, tbsp, cup, clove, whole, pinch, or "" for countable items), section (exactly one of: Produce, Meat & Seafood, Dairy, Bakery, Dry & Canned, Spices, Frozen, Other), and isStaple (true for common pantry items like oil, salt, sugar, flour, common spices).
Each step has number, instruction, and ingredientRefs — an array of ingredient names used in that step that match the ingredients names exactly.
difficulty is one of: easy, medium, hard. Use "" for tip if none and [] for dietaryTags if none.


Fill in the dish and servings, paste the JSON it returns into the app's Import screen, and it'll validate against this schema on the way in.