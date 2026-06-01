# Handover

**For:** Manning · Personal recipe app, Android tablet, no backend.

A personal recipe app that browses/imports recipes, plans them into weekly meal
calendars, generates a pantry-aware shopping list, runs a step-by-step cooking
screen, and tracks history. Planning and design are **done and locked**.

## Read first

1. `docs/requirements/SPEC_FINAL.md` — master spec, single source of truth.
2. `docs/design/STYLE_GUIDE.md` — palette, type, components, animation.
3. `docs/requirements/IMPORT_FORMAT.md` — JSON schema for imported recipes
   (Spoonacular normalizes into this too).
4. `project/GAPS.md` — what's built, partial, stubbed, and still open.

## Locked decisions

See `docs/decisions/0001-stack-and-architecture.md`. In brief: Capacitor + React,
on-device SQLite, Spoonacular (key in Settings) + Import path, no in-app AI,
imperial units, fixed cream/light theme.

## How Manning works (Builder mode)

Ship-oriented; readable over clever (he maintains it); ask before adding a new
dependency; he leads scope; he's a strong engineer (Python/R/SAS, comfortable
full-stack) — talk to him as one.
