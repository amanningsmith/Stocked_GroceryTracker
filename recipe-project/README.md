# Recipe Project

Personal recipe app for a 2-person household — browse/import recipes, plan weekly
meals, generate a pantry-aware shopping list, cook step-by-step, track history.
Capacitor + React + on-device SQLite, Android tablet, no backend.

This repo is the **whole project**, not just the code. The app lives in `app/`;
everything around it (requirements, bugs, testing, project meta) sits alongside.

## Layout

| Folder | What's in it |
|---|---|
| **`app/`** | The application. Self-contained — open *this* folder in VS Code to code. Has its own `README`, `SETUP`, `VSCODE`, tooling. |
| **`docs/`** | Source-of-truth requirements & design. `requirements/` (spec, import format), `design/` (style guide), `decisions/` (why things were locked), `HANDOVER.md`. |
| **`bugs/`** | Markdown bug tracking. `BUGS.md` is the active log; closed items move to `archive/`. See `bugs/README.md`. |
| **`testing/`** | `TEST_PLAN.md` (master prompt + manual checklist), `manual/` run records, `evidence/` (screenshots/logs), `results/` (coverage, automated output). |
| **`project/`** | `GAPS.md` (status/stubs/open decisions), `ROADMAP.md`, `CHANGELOG.md`. |

## Two ways to open it

- **Coding:** open `app/` as the VS Code workspace. All tasks, debug (F5), and
  formatting work with no path changes.
- **Project management:** open the repo root to triage bugs, update the roadmap,
  log test runs, or revise requirements.

## Start here

1. App setup & run: `app/SETUP.md`
2. Editor setup: `app/VSCODE.md`
3. Current status & what's unfinished: `project/GAPS.md`
4. What to build/verify next: `project/ROADMAP.md`
5. Test the build: `testing/TEST_PLAN.md`

## Conventions

- Docs are Markdown, tracked in git — the bug log and test records are diffable
  history, not a separate tool.
- Requirements in `docs/` are the contract; if the app diverges, either the code
  is a bug or the doc needs an update + a note in `docs/decisions/`.
