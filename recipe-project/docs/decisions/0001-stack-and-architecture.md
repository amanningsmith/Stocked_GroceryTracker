# 0001 — Stack & architecture

**Status:** Accepted (locked during planning, May 2026)

## Context

Personal recipe app for a 2-person household, running on one Android tablet. No
paid hosting, no backend, single user. Needs recipe browsing, meal planning, a
smart shopping list, a cooking screen, and history.

## Decision

- **Capacitor + React + Vite**, packaged as a sideloaded Android APK. Reuses a web
  prototype + design system.
- **On-device SQLite** (`@capacitor-community/sqlite`) as the single source of truth
  for all user data. `jeep-sqlite` web fallback for dev.
- **Spoonacular** API for recipe data (key in Settings), with fetched recipes cached
  into SQLite to protect the free-tier daily quota.
- **No in-app AI / no Anthropic key.** AI recipes are generated elsewhere and pasted
  into an Import screen using the fixed JSON schema (`docs/requirements/IMPORT_FORMAT.md`).
- **Normalization layer:** Spoonacular and imported recipes map to one common shape,
  so card / shopping / cooking logic is source-agnostic.
- **Imperial units. Fixed cream/light theme** (no dark mode in v1).

## Consequences

- Zero hosting cost and full offline-of-cache browsing; the only network dependency
  is Spoonacular.
- Recipe arrays (ingredients/steps/tags) stored as JSON columns in SQLite — simple
  for single-user scale; ingredient search is `LIKE` on the blob rather than a join.
  Easy to normalize into child tables later if needed.
- Updates to JS/CSS can be pushed via live-reload over USB/wifi; native changes
  require a rebuilt APK. (OTA via Capgo free tier is an option, not adopted.)

## Related

- Full contract: `docs/requirements/SPEC_FINAL.md`
- Visual contract: `docs/design/STYLE_GUIDE.md`
