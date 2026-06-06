# Device test run — AI Recipe Generation

- **Build/commit:** <git short sha>
- **Device:** <tablet model, Android version> + browser (web dev)
- **Tester:** Manning
- **App load mode:** installed APK (`npm run android:run`) for native; `npm run dev` for web

## Pre-conditions

- Valid Anthropic API key set in Settings → Claude AI
- At least Haiku 4.5 model selected (default)

## Test cases

| # | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| 1 | No key set | Clear the Anthropic key in Settings. Open Import → tap Generate. | Error shown: "No Anthropic API key set — add one in Settings → Claude AI." No API call made. | | |
| 2 | Single recipe — basic | Set key. Prompt: "weeknight chicken dinner under 30 min, no dairy". Count = 1. Tap Generate. | Spinner visible. Generated JSON populates the paste textarea. "✓ Imported 1 recipe." shown. Recipe appears in Favorites/Finder. | | |
| 3 | Multiple recipes (count=3) | Prompt: "quick vegetarian meals". Count = 3. Tap Generate. | Returns 3 recipes. Summary: "✓ Imported 3 recipes." | | |
| 4 | Recipe opens correctly | Open a generated recipe from the Finder. | Name, description, ingredients, steps, tip all present and readable. | | |
| 5 | Cooking mode — ingredient highlighting | Open a generated recipe → tap Cook. Select a step. | Ingredients referenced by that step highlight correctly. Confirms ingredientRefs matched ingredient names exactly. | | |
| 6 | Enum adherence | After importing, open generated recipe detail. Check difficulty, ingredient sections. | `difficulty` is one of easy/medium/hard. All ingredient `section` values match the 8 canonical sections. No validation errors on import. | | |
| 7 | Validator warnings visible | Import with Count=1, broad prompt. | Any soft warnings (non-canonical unit, macroContributors outside 2–5) appear in the import notes section, but recipe still imports. | | |
| 8 | Bad API key (401) | Set an invalid key. Tap Generate. | Error message surfaces: "Anthropic API error 401: …". Nothing saved. | | |
| 9 | Model switch to Sonnet | In Settings, switch to claude-sonnet-4-6. Tap Generate with same prompt as #2. | Generation succeeds. Recipe quality may be noticeably richer. | | |
| 10 | Web dev (CORS) | `npm run dev`. Set key. Tap Generate. | Either succeeds via `anthropic-dangerous-direct-browser-access` header, or shows a clear error. No crash. Nothing half-saved on error. | | |
| 11 | Malformed JSON from model (rare, simulate) | Temporarily modify `anthropic.js` to return a non-JSON string. Tap Generate. | Error shown: "Model returned malformed JSON: …". Nothing saved. | | |
| 12 | Generated JSON visible in textarea | After any successful Generate call. | Paste textarea is populated with the generated JSON array — user can read/copy/edit before any future manual import. | | |
| 13 | Paste path still works | Clear prompt. Type valid JSON into paste textarea. Tap "Validate & import". | Original paste flow unaffected. | | |

## Notes

- v1 documented gaps:
  - No streaming — a spinner is shown while the single request completes. 5 recipes may take a few seconds.
  - Images not generated — `fetchImageForName` backfills a Spoonacular image on first recipe detail open.
  - No in-app token/cost display — use the Anthropic console dashboard.
  - Enum drift: if `RECIPE_IMPORT_FORMAT.md` enums change, the `SYSTEM` constant in `anthropic.js` must be updated to match.
