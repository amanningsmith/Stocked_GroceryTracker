# Testing — master prompt + plan

This file has two parts:
1. A **master prompt** to paste into a fresh Claude chat / Claude Code to build the
   test suite. It's self-contained.
2. A **manual device-test checklist** for the things that can't be unit-tested
   (native SQLite, Spoonacular calls, the tablet UI).

---

## Part 1 — Master prompt (copy everything in the block)

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
> - Read these first: `app/README.md`, `project/GAPS.md`,
>   `docs/requirements/IMPORT_FORMAT.md`, `docs/requirements/SPEC_FINAL.md` (the
>   locked spec), and the source under `app/src/`. (Paths are relative to the
>   project root; if you open `app/` directly, the spec/import docs are one level up.)
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
> - **`app/src/lib/weeks.js`** — `generateWeeks(year)`. Assert: 2026 yields 53 weeks;
>   Week 1 = Jan 1–3 and `isPartial`; Week 2 = Jan 4–10 full Sun–Sat; Week 53 =
>   Dec 27–31 partial. Also test a year where Jan 1 IS Sunday (e.g. 2023) — Week 1
>   should be a FULL week and not flagged partial. Test `daysOf()` length and bounds,
>   and `currentWeek()` date-containment logic (mock the DB layer).
> - **`app/src/lib/shoppingList.js`** — `buildShoppingLines()`: same name+unit merges and
>   sums; different units stay separate lines; amounts scale by `servings/recipe.servings`;
>   a line is `status:"have"` iff every contributing recipe marks it `isStaple`, else
>   `"need"`. `groupBySection()`: sections come out in the fixed store order
>   (Produce → … → Other), unknown sections fall to Other. `listToText()`: `onlyNeeded`
>   filters out `have` lines and the format is stable.
> - **`app/src/lib/overlap.js`** — `overlapScore()`: staples are ignored; score is
>   (shared perishables / candidate perishables); empty pool or empty candidate → 0.
>   `sortByOverlap()` orders descending.
> - **`app/src/lib/validateImport.js`** — feed it the worked example from
>   `docs/requirements/IMPORT_FORMAT.md` → `ok:true`, zero errors/warnings. Then build
>   broken variants and assert the specific error fires: bad `section` enum, string
>   `amount` ("½"), a duplicate ingredient name, an `ingredientRefs` entry that
>   matches no ingredient (FATAL), a ref that matches case-insensitively but not
>   exactly (WARNING), missing `tip` key (WARNING), `source` ≠ "imported", and
>   macroContributors length outside 2–5 (WARNING). Confirm `ok:false` blocks the
>   recipe and `recipe:null`.
> - **`app/src/lib/sections.js`** — `aisleToSection()` maps representative Spoonacular
>   aisle strings to the 8 sections; semicolon-joined aisles use the first segment;
>   unknown → Other. `sectionRank()` ordering.
>
> ### Priority 2 — normalization (mock `fetch`, no live API):
> - **`app/src/api/spoonacular.js`** — feed canned `complexSearch`, `information`, and
>   `analyzedInstructions` JSON fixtures; assert the normalized object matches the
>   common recipe shape (ids prefixed `sp_`, dietaryTags derived from booleans,
>   per-step `ingredientRefs` populated from analyzed instructions, aisle → section,
>   `tip:""`). Assert a 402 response surfaces the quota error message.
>
> ### Priority 3 — repository layer (mock the `db.js` query/run/upsert exports):
> - **`app/src/state/store.js`** — `toggleFavorite()` adds then removes; `addMeal()`
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
> 3. A short results write-up in `testing/results/TEST_RESULTS.md`: what's covered, what you deliberately skipped and why,
>    any bugs the tests surfaced (with the failing case), and the coverage of the
>    `app/src/lib/**` modules specifically.
> 4. Keep tests readable and intent-revealing — Manning maintains this himself.
>
> Start by reading the files, then propose the test file layout and the dep list and
> wait for my go-ahead before writing the full suite.

---

## Part 2 — Manual device-test checklist (can't be unit-tested)

Run these on the tablet (or `npm run dev` in Chrome where noted). These cover the
native + integration surface the unit suite mocks out.

### Foundation
- [ ] App launches; no console errors on boot (`chrome://inspect` against the device).
- [ ] Settings → paste Spoonacular key → reopen app → key persists (Preferences).
- [ ] SQLite survives an app restart: add a favorite, force-close, reopen → still there.

### MVP1 Finder + Favorites
- [ ] Search by name returns results; search by ingredient returns results.
- [ ] Each of the 7 filters changes results; combining filters narrows correctly.
- [ ] "Load 100 more" appends and shows the running count.
- [ ] Re-running an identical search doesn't re-spend quota (results served from cache).
- [ ] Favorite toggles, persists, and appears in Saved.

### MVP2 Weeks + Calendar
- [ ] Current week is selected by default; the 53-week dropdown is complete.
- [ ] Add a recipe to a specific day + slot (lunch/dinner) at 2 servings (default).
- [ ] Edit servings (cap at 4), remove a meal, swap a meal — all persist.

### MVP3 Shopping list
- [ ] List auto-builds from the week's recipes; same ingredient across two recipes merges.
- [ ] Quantities scale with servings.
- [ ] Sections appear in store order; staples land in "probably have".
- [ ] Have/need toggle persists.
- [ ] **Export** opens the native share sheet → confirm it reaches Notes AND Messages.

### MVP5 Overlap sort
- [ ] With recipes already in the week, the finder's "shared ingredients" sort
      surfaces overlapping recipes near the top; staples don't inflate the match.

### MVP6 Cooking mode
- [ ] Full ingredient list always visible; selecting a step highlights exactly that
      step's ingredients.
- [ ] Manual timer starts/pauses/resets per step.
- [ ] Screen stays awake (wake lock) while cooking; releases on exit.
- [ ] Large tap targets; prev/next stepping works.

### MVP4 Cooking history
- [ ] Log a cook (rating/notes/adjustments/date); it appears in the recipe detail
      history block with average rating + latest notes.
- [ ] (Known gap — photos + auto-prompt not yet built; see `project/GAPS.md`.)

### Import path
- [ ] Use the prompt in `docs/requirements/IMPORT_FORMAT.md` to generate a recipe, paste
      into Import → validates, saves, opens, and cooks with correct highlighting.
- [ ] Paste deliberately broken JSON → fatal errors shown, nothing saved.

### Edge / resilience
- [ ] No Spoonacular key set → Finder shows a clear error, doesn't crash.
- [ ] Quota reached (402) → clear message, app stays usable (cache still browsable).
- [ ] Airplane mode → cached recipes still open; new searches fail gracefully.
