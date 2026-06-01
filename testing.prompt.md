# Testing Master prompt (copy everything in the block)

> You are picking up a finished personal recipe app and building its **test suite**.
> Do not change app behavior or re-architect anything — write tests against the code
> as it stands, and only fix a bug if a test proves one exists (flag it first).
>
> ### Stack & context
> - **Capacitor 6 + React 18 + Vite**, on-device **SQLite** (`@capacitor-community/sqlite`,
>   `jeep-sqlite` web fallback), **Spoonacular** API (key in Settings via
>   `@capacitor/preferences`), **`@capacitor/share`** for export. Android tablet, single user.
> - Both Spoonacular and imported recipes normalize into ONE recipe shape, so the
>   card / shopping logic / cooking screen are source-agnostic.
> - Read these first: `README.md`, `GAPS.md`, `docs/RECIPE_IMPORT_FORMAT.md`,
>   `RECIPE_APP_SPEC_FINAL.md` (the locked spec), and the source under `src/`.
>
> ### Test framework
> - Use **Vitest** (native to Vite — no config friction) + **@testing-library/react**
>   + **jsdom** for the component tests. Add them as devDependencies and a
>   `"test": "vitest"` / `"test:run": "vitest run"` script. Tell me the exact deps
>   you added and why before finalizing.
> - Put unit tests next to or under `src/**/__tests__/`. Mock Capacitor plugins and
>   `fetch` — no test should touch a real device, a real DB, or the network.
>
> ### Priority 1 — pure logic (highest value, fully deterministic). Cover these hard:
> - **`src/lib/weeks.js`** — `generateWeeks(year)`. Assert: 2026 yields 53 weeks;
>   Week 1 = Jan 1–3 and `isPartial`; Week 2 = Jan 4–10 full Sun–Sat; Week 53 =
>   Dec 27–31 partial. Also test a year where Jan 1 IS Sunday (e.g. 2023) — Week 1
>   should be a FULL week and not flagged partial. Test `daysOf()` length and bounds,
>   and `currentWeek()` date-containment logic (mock the DB layer).
> - **`src/lib/shoppingList.js`** — `buildShoppingLines()`: same name+unit merges and
>   sums; different units stay separate lines; amounts scale by `servings/recipe.servings`;
>   a line is `status:"have"` iff every contributing recipe marks it `isStaple`, else
>   `"need"`. `groupBySection()`: sections come out in the fixed store order
>   (Produce → … → Other), unknown sections fall to Other. `listToText()`: `onlyNeeded`
>   filters out `have` lines and the format is stable.
> - **`src/lib/overlap.js`** — `overlapScore()`: staples are ignored; score is
>   (shared perishables / candidate perishables); empty pool or empty candidate → 0.
>   `sortByOverlap()` orders descending.
> - **`src/lib/validateImport.js`** — feed it the worked example from
>   `docs/RECIPE_IMPORT_FORMAT.md` → `ok:true`, zero errors/warnings. Then build
>   broken variants and assert the specific error fires: bad `section` enum, string
>   `amount` ("½"), a duplicate ingredient name, an `ingredientRefs` entry that
>   matches no ingredient (FATAL), a ref that matches case-insensitively but not
>   exactly (WARNING), missing `tip` key (WARNING), `source` ≠ "imported", and
>   macroContributors length outside 2–5 (WARNING). Confirm `ok:false` blocks the
>   recipe and `recipe:null`.
> - **`src/lib/sections.js`** — `aisleToSection()` maps representative Spoonacular
>   aisle strings to the 8 sections; semicolon-joined aisles use the first segment;
>   unknown → Other. `sectionRank()` ordering.
>
> ### Priority 2 — normalization (mock `fetch`, no live API):
> - **`src/api/spoonacular.js`** — feed canned `complexSearch`, `information`, and
>   `analyzedInstructions` JSON fixtures; assert the normalized object matches the
>   common recipe shape (ids prefixed `sp_`, dietaryTags derived from booleans,
>   per-step `ingredientRefs` populated from analyzed instructions, aisle → section,
>   `tip:""`). Assert a 402 response surfaces the quota error message.
>
> ### Priority 3 — repository layer (mock the `db.js` query/run/upsert exports):
> - **`src/state/store.js`** — `toggleFavorite()` adds then removes; `addMeal()`
>   clamps servings to max 4; `buildShoppingLines` integration via
>   `weekRecipesWithServings()` (mock rows). Verify SQL is parameterized (no string
>   interpolation of values).
>
> ### Priority 4 — components (testing-library + jsdom, mock the store + Capacitor):
> - **RecipeRow** renders name/meta/macro pills, shows the "imported" pill only for
>   imported recipes, falls back to the cuisine-initial tile when `image` is null,
>   and fires `onOpen`/`onAdd` without cross-triggering (favorite/add `stopPropagation`).
> - **AddToWeek** defaults to the current week, clamps servings to 1–4, calls
>   `addMeal` with the chosen day/slot.
> - **ImportScreen** shows fatal errors and blocks on invalid JSON; shows the
>   "imported with notes" warnings block on a valid-but-warned import.
> - **CookingScreen** highlights exactly the current step's `ingredientRefs` (exact
>   case-insensitive match — assert "salt" does NOT highlight "salted butter").
>
> ### Deliverables
> 1. The configured test setup (deps, scripts, any `vitest.config.js` / jsdom setup file).
> 2. The test files, organized by the priorities above.
> 3. A short `TEST_RESULTS.md`: what's covered, what you deliberately skipped and why,
>    any bugs the tests surfaced (with the failing case), and the coverage of the
>    `src/lib/**` modules specifically.
> 4. Keep tests readable and intent-revealing — Manning maintains this himself.
>
> Start by reading the files, then propose the test file layout and the dep list and
> wait for my go-ahead before writing the full suite.