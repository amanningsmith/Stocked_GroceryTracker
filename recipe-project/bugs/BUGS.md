# Bug Log

See `README.md` for conventions. IDs are `BUG-NNN`, never reused.

## Open

| ID | Sev | Title | Area | Repro / notes | Status |
|---|---|---|---|---|---|
| BUG-001 | S3 | Finder "method" filter doesn't constrain results | Finder / Spoonacular | Spoonacular `complexSearch` has no cooking-method param, so the chip renders but does nothing. Options: filter client-side over cached recipes, or hide the chip for live search. See `project/GAPS.md §5.6`. | Open |

## Resolved

| ID | Sev | Title | Area | Fix / commit | Status |
|---|---|---|---|---|---|
| BUG-000 | — | _(example row — delete when you log a real one)_ | — | example of the resolved format | Fixed |

---

### Entry detail template (copy for anything non-trivial)

```
#### BUG-00N — <short title>
- Severity: S1 / S2 / S3
- Area: <screen / module / file>
- Found: <date> on <web | device>
- Steps:
  1. …
- Expected: …
- Actual: …
- Evidence: testing/evidence/screenshots/<file>  (if device-only)
- Fix: <commit / PR / note>
```
