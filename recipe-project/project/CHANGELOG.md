# Changelog

Dated record of what shipped. Newest first. (Format loosely follows Keep a Changelog.)

## [Unreleased]

### 1. "Lay out the meat" thaw reminders (Idea #2)
**Purpose:** Native Android notifications remind the user to move frozen meat to the fridge the evening before it's needed, based on the meal plan.
**Date:** 2026-06-06
**Files Modified:** `android/app/src/main/AndroidManifest.xml`, `app/src/db/schema.js`, `app/src/lib/thawReminders.js` (new), `app/src/state/store.js`, `app/src/screens/WeekScreen.jsx`, `app/src/screens/SettingsScreen.jsx`, `RECIPE_APP_SPEC_FINAL.md`, `testing/manual/thaw-reminders-test-run.md` (new), `package.json`

#### Changes:
- **Dependency:** `@capacitor/local-notifications@6.1.3` installed and synced. `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, and `SCHEDULE_EXACT_ALARM` permissions added to `AndroidManifest.xml` manually (cap sync did not auto-add them).
- **Schema:** two new columns on `meal_entry` — `thawReminder INTEGER` (null=heuristic, 0=off, 1=on) and `notificationId INTEGER`. Added as ALTER TABLE migrations so existing installs upgrade safely.
- **`thawReminders.js`:** new module containing all scheduling logic — `needsThaw`, `notifIdFor` (deterministic id), `fireTime` (local date-part construction, avoids UTC-parse bug), `ensurePermission`, `checkPermission`, `scheduleForEntry`, `cancelForEntry`, `cancelForEntryIds`. All plugin calls guard on `Capacitor.isNativePlatform()` so the web dev build never crashes.
- **`store.js`:** `addMeal` schedules a notification after insert (non-blocking async, never blocks the DB write). `removeMeal` cancels before deleting. `deleteRecipe` fetches affected meal ids and bulk-cancels before the cascade delete (gap identified during review — not in original handover). New `updateMealThawReminder(id, thawReminder, recipe)` persists the override and reschedules.
- **`WeekScreen.jsx`:** `recipeData` cache expanded to full recipe objects (was `{name, image}` only — needed `protein` for heuristic). Each non-custom meal entry shows a ❄ toggle button: terracotta when active, grey when off. Tapping cycles the override (null→explicit opposite, explicit→null). Optimistic UI update before the async store call.
- **`SettingsScreen.jsx`:** new Reminders section with master enable toggle, reminder time (±1 hr, 00:00–23:00, default 20:00 stored in Preferences), and "Grant notification permission" button (`ensurePermission`). Shows "granted ✓" or a "denied — open device Settings" message based on current permission status.
- **Spec:** `RECIPE_APP_SPEC_FINAL.md` updated — architecture table, MealEntry shape, Idea #2 status and design decisions, build order step 8 marked active.
- **v1 documented gaps:** multi-day thaw, lunch morning-of reminder, bulk reschedule on time change, move-meal reschedule (no date-change UI exists yet).

### Added
- Full project structure: `app/`, `docs/`, `bugs/`, `testing/`, `project/`.
- VS Code scaffolding in `app/` (settings, tasks, launch, extensions, prettier, editorconfig, jsconfig, nvmrc).
- `app/SETUP.md` device workflow + `npm run push` live-reload script; auto-copy of SQLite wasm.
- `testing/TEST_PLAN.md` master testing prompt + manual device checklist.
- Bug tracking system (`bugs/`), roadmap, changelog, decision log.

### Built (initial scaffold)
- Foundation + MVP1, MVP2 (+Calendar), MVP3 core, MVP5, MVP6 as working code.
- Import validator reconciled to `IMPORT_FORMAT.md`; `tip` persisted; cooking-mode
  highlight switched to exact matching.

### Known gaps
- MVP4 photos + auto-prompt, learning pantry usage signal, notifications, test suite,
  ESLint config. See `GAPS.md`.

---

_Tag real releases below once you cut them, e.g._
## [0.1.0] — YYYY-MM-DD
