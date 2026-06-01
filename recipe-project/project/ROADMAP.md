# Roadmap

Build order from the spec, annotated with where things actually stand. Feature
ideas live here; defects live in `bugs/BUGS.md`. Detailed status is in `GAPS.md`.

## Shipped (built in scaffold)

- [x] **Foundation** — Capacitor + React shell, SQLite schema, Spoonacular client
      + normalizer, Import screen + validator (matches `IMPORT_FORMAT.md`).
- [x] **MVP1** — Finder + Favorites (7 filters, name+ingredient search, 100/page).
- [x] **MVP2 + Calendar** — 53-week year (partial first/last, verified), lunch+dinner,
      servings max 4/default 2, editable.
- [x] **MVP3 (core)** — shopping list: merge + section grouping + static staples + export.
- [x] **MVP5** — ingredient-overlap sort.
- [x] **MVP6** — Cooking mode (full ingredients + per-step highlight, manual timers, wake lock).

## Partial / stubbed (see GAPS.md)

- [ ] **MVP4 cooking history** — log entry + history block done; **photos** and
      **auto-prompt** not built.
- [ ] **Pantry subsystem** — CRUD + time-based restock done; usage-based depletion
      and accept/deny-on-list stubbed.

## Not started

- [ ] **Notifications (Idea #2)** — "lay out the meat" the night before.
- [ ] **Test suite** — see `testing/TEST_PLAN.md` (Vitest not yet added).
- [ ] **ESLint config** — Prettier is set up; lint-on-save not yet wired.

## Open decisions

- App name (placeholder is "Recipe App" / `com.manning.recipeapp`).
- Finder method filter: client-side filter vs hide for live search (BUG-001).
- Unit conversion in shopping merge (currently same-unit only — intentional).
- OTA updates (Capgo free tier) vs plug-in-and-push only.
