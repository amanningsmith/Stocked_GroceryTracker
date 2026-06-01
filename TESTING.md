# Testing — master prompt + plan

This file has two parts:
1. A **master prompt** to paste into a fresh Claude chat / Claude Code to build the
   test suite. It's self-contained.
2. A **manual device-test checklist** for the things that can't be unit-tested
   (native SQLite, Spoonacular calls, the tablet UI).

---

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
- [ ] (Known gap — photos + auto-prompt not yet built; see `GAPS.md`.)

### Import path
- [ ] Use the prompt in `docs/RECIPE_IMPORT_FORMAT.md` to generate a recipe, paste
      into Import → validates, saves, opens, and cooks with correct highlighting.
- [ ] Paste deliberately broken JSON → fatal errors shown, nothing saved.

### Edge / resilience
- [ ] No Spoonacular key set → Finder shows a clear error, doesn't crash.
- [ ] Quota reached (402) → clear message, app stays usable (cache still browsable).
- [ ] Airplane mode → cached recipes still open; new searches fail gracefully.
