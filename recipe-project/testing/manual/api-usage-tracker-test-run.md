# Device test run — API Usage Tracker + Per-API Toggles

- **Build/commit:** <git short sha>
- **Device:** <tablet model, Android version> + browser (web dev)
- **Tester:** Manning
- **App load mode:** installed APK (`npm run android:run`)

## Pre-conditions

- Valid Spoonacular and Anthropic API keys set in Settings
- Both API toggles in known state (on) before starting

## Logging tests

| # | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| 1 | Anthropic call logged | Generate a recipe (Import → Generate). Open Settings → Usage. | `api_usage` row with `provider=anthropic`, `endpoint=messages`, non-null `inputTokens`, `outputTokens`, and the model name. `ok=1`. | | |
| 2 | Spoonacular search logged | Open Finder, run a search. Open Settings → Usage. | Row with `provider=spoonacular`, `endpoint=complexSearch`, `quotaUsed` and `quotaLeft` populated (verify header names are `X-API-Quota-Used` / `X-API-Quota-Left` against a real response). | | |
| 3 | Spoonacular recipe detail logged | Open a recipe from the Finder (triggers /information + /analyzedInstructions). | Two rows: `endpoint=information` and `endpoint=analyzedInstructions`, both with quota fields. | | |
| 4 | Error logged | Set a bad Anthropic key. Try to generate. | Row logged with `ok=0` and a truncated error note. Nothing saved as a recipe. | | |
| 5 | Usage panel totals correct | After a mix of calls. | Total calls, input/output tokens, and estimated cost match the sum of individual rows. | | |
| 6 | Estimated cost formula | Note the Haiku token counts. | `cost ≈ inputTokens/1M × $1 + outputTokens/1M × $5`. Label reads "estimated". | | |
| 7 | Recent calls list | Tap "Recent calls" in the Usage panel. | Last 25 calls shown: time · provider · endpoint · tokens or quota · ok/fail indicator. | | |

## Toggle tests

| # | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| 8 | Anthropic off — no call | Toggle Anthropic off. Try to Generate on Import screen. | Error: "Anthropic API is turned off in Settings → API Controls." **No new row** in `api_usage`. No network call. | | |
| 9 | Spoonacular off — degrade gracefully | Toggle Spoonacular off. Open Finder and search. | No Spoonacular call made. Finder shows imported recipes only, no crash. Error message visible. | | |
| 10 | Toggle back on | Turn both APIs back on. Make a call. | Calls resume and log normally. | | |

## Restart persistence tests ⭐

| # | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| 11 | Spoonacular off survives restart | Turn Spoonacular off. Fully close the app (recent apps → swipe away). Reopen. Open Settings → API Controls. | Spoonacular toggle shows **off** (not the default on). A Finder search still makes no call. | | |
| 12 | Anthropic off survives restart | Same as above for Anthropic. | Toggle shows off. Generate shows "API is turned off" without making a network call. | | |
| 13 | Both on survives restart | Both toggles on. Close and reopen. | Both show on. | | |
| 14 | Fresh install default | Clear app data (or first install). Open Settings. | Both toggles show **on**. Re-open Settings (second launch) — still on, no flicker. | | |

## Clear log test

| # | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| 15 | Clear usage log | In Settings → Usage, tap "Clear usage log" → confirm. | Table empties. Panel resets to 0 calls/tokens. Toggles unaffected. | | |

## Notes

- v1 documented gaps:
  - Spoonacular quota header names (`X-API-Quota-Used` / `X-API-Quota-Left`) — verify exact casing from a real response; if absent fall back to call-count only.
  - Cost is an estimate; Anthropic console is the billing truth.
  - Log grows unbounded (trivial at personal volume; prune after 90 days later if needed).
  - Toggle is a manual kill switch; the Anthropic console budget cap is the real spend guard.
  - Changing reminder time does not bulk-reschedule existing pending notifications.
