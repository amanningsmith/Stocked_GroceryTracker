# Changelog

Dated record of what shipped. Newest first. (Format loosely follows Keep a Changelog.)

## [Unreleased]

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
