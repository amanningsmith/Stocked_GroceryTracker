# Bug tracking

Lightweight, markdown-based, solo-dev friendly. No external tool — the log is
`BUGS.md`, tracked in git so you get history for free.

## Flow

1. Find a bug → add a row to the **Open** table in `BUGS.md` with the next ID.
2. Working on it → set status to `In progress`.
3. Fixed → set status to `Fixed`, note the commit/PR, move the row to the bottom
   **Resolved** section (or, once that section gets long, cut it into
   `archive/CLOSED-<period>.md`).

## ID convention

`BUG-NNN`, zero-padded, never reused. (Feature/enhancement ideas go in
`project/ROADMAP.md`, not here — this file is for defects only.)

## Severity

| Level | Meaning |
|---|---|
| **S1** | Blocks core use (app crash, data loss, can't cook/shop/plan) |
| **S2** | Major feature broken, has a workaround |
| **S3** | Minor / cosmetic |

## Status values

`Open` · `In progress` · `Fixed` · `Won't fix` · `Can't reproduce`

## Writing a good entry

Repro steps, expected vs actual, and where it happens (screen + file if known).
For device-only bugs, link a screenshot/log under `testing/evidence/`.
