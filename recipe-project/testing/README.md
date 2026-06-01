# Testing

## What's here

| Path | Purpose |
|---|---|
| `TEST_PLAN.md` | The master prompt for building the automated suite **and** the manual device checklist. Start here. |
| `manual/` | Dated records of manual test runs. Copy `TEMPLATE-device-run.md` per session. |
| `evidence/` | Screenshots, screen recordings, and logs backing a test result or bug. |
| `results/` | Automated output — Vitest run logs, coverage reports (`coverage/`). |

## How testing works on this project

Two layers, because half the app is pure logic and half is native:

- **Automated (unit) — for the logic.** Week generation, shopping merge/scale,
  overlap scoring, the import validator, section mapping, the Spoonacular
  normalizer. These are deterministic and mocked — see Part 1 of `TEST_PLAN.md`.
  Output and coverage land in `results/`.
- **Manual (device) — for the rest.** SQLite persistence, the native share sheet,
  wake lock, quota/offline behavior, and the actual tablet UX. Each pass gets a
  dated file in `manual/` and any screenshots in `evidence/`.

## Logging a manual run

1. `cp manual/TEMPLATE-device-run.md manual/$(date +%F)-device-run.md`
2. Walk Part 2 of `TEST_PLAN.md`, check items off, note failures.
3. File a `bugs/BUGS.md` row for each failure; drop supporting shots in `evidence/`.
