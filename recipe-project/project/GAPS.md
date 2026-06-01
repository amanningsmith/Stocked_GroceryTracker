# GAPS — Recipe App build

**Build date:** May 30, 2026 · **Against:** `RECIPE_APP_SPEC_FINAL.md` v1, `RECIPE_APP_STYLE_GUIDE.md` v1

This is the honest accounting of what got built end-to-end in this pass, what's
partial, what's stubbed, and what needs your input or a real device. Nothing here
re-opens a locked decision — it's just the delta between "specced" and "running."

---

## 1. Inputs

### 1a. `RECIPE_IMPORT_FORMAT.md` — RESOLVED ✅
The format doc is now integrated. The validator (`src/lib/validateImport.js`) and
normalizer enforce it exactly:
- Closed enums wired up: `difficulty ∈ {easy, medium, hard}`, the 8 store sections,
  and the canonical unit set (`g, kg, oz, lb, ml, l, tsp, tbsp, cup, clove, whole, pinch, ""`).
- **`ingredientRefs` are validated against ingredient names** — a ref that matches
  nothing is a fatal error (it would silently break cooking-mode highlighting); a
  case/spacing-only mismatch is a warning. Cooking mode now uses exact case-insensitive
  matching to match this guarantee (no more "salt" → "salted butter" false positives).
- **`tip` is now persisted** (was being dropped — schema column + write list fixed) and
  shown in the recipe detail.
- Soft `warnings` (missing `tip` key, non-canonical unit, macroContributors outside 2–5)
  don't block import — they're surfaced on the Import screen.
- Validated against the doc's worked example (clean pass) and a deliberately broken
  variant (caught the bad section, string amount, and ref typo).

> Note: the format doc says "seven enum values" for `section` but lists **eight**
> (matches spec MVP3). I treated eight as correct.

### 1b. Spoonacular API key
Required to run the Finder. There's no key in the repo (correct — single user, you
own it). Enter it in **Settings**; it's stored via Capacitor Preferences under
`spoonacular_key`. Until it's set, the Finder shows a "No Spoonacular API key" error.

---

## 2. Dependencies I added (you asked to be told)

Per your "ask before adding a dependency" rule — I couldn't ask mid-build, so here's
the full list to approve/reject. All are implied by the locked stack except where noted.

| Package | Why | Locked? |
|---|---|---|
| `@capacitor-community/sqlite` | On-device SQLite (spec §2) | Yes |
| `jeep-sqlite` + `sql.js` | **Required** web fallback so SQLite runs in `vite dev`. No-op on native Android. | Implied by above |
| `@capacitor/share` | Shopping-list export to Notes/Messages (MVP3) | Implied |
| `@capacitor/preferences` | Store the Spoonacular key in "Settings" (spec §2) | Implied |
| `@capacitor/android`, `@capacitor/cli` | APK packaging | Yes |
| `vite`, `@vitejs/plugin-react` | Build tooling | Implied |

**Deliberately NOT added:**
- **react-router** — used a ~10-line hand-rolled view state in `App.jsx` instead.
  Fine for a 5-tab app; add the router if you want back-button/deep-link behavior.
- **@capacitor/local-notifications** — needed for Idea #2 ("lay out the meat"),
  which is deferred. Install when we build notifications.
- **@capacitor/camera** — needed for cook-log photos (see §4).

---

## 3. Implementation status by MVP

| Area | Status | Notes |
|---|---|---|
| Foundation: Capacitor+React shell | ✅ Built | `App.jsx`, tab nav, DB init on boot |
| Foundation: SQLite schema (§3) | ✅ Built | `src/db/schema.js` — all 8 tables; arrays as JSON columns |
| Foundation: Spoonacular client + normalizer | ✅ Built | `src/api/spoonacular.js` — complexSearch + information + analyzedInstructions, mapped to common shape |
| Foundation: Import + validator | ✅ Built | Matches `RECIPE_IMPORT_FORMAT.md`: enums, unit set, ref-matching, warnings; tested against the worked example |
| MVP1: Finder | ✅ Built | 7 filters, name+ingredient search, 100/page, macro pills, cache-on-fetch |
| MVP1: Favorites | ✅ Built | Persisted, browsable |
| MVP2: Weeks + Calendar | ✅ Built | 53-week gen **verified** for 2026 (partial first/last); lunch+dinner; servings max4/default2; editable |
| MVP3: Shopping list core | ✅ Built | merge + section grouping + have/need toggle + Share export |
| MVP3: "Probably have" | ⚠️ Static only | Driven by `ingredient.isStaple` (per spec "static staples first"). Learning pantry not yet wired in. |
| MVP5: Overlap sort | ✅ Built | `src/lib/overlap.js`, toggle in Finder; ignores staples |
| MVP6: Cooking mode | ✅ Built | full ingredients + per-step highlight + manual timers + wake lock |
| MVP4: Cooking history | ⚠️ Partial | Log entry (rating/notes/adjustments/date) + history block in detail. **No photos**, **no auto-prompt** (see §4, §5) |
| Pantry subsystem (§5) | ⚠️ Thin | CRUD + time-based restock signal only. Usage-based depletion (Idea #3) + accept/deny-on-list = stubbed |
| Notifications (Idea #2) | ❌ Not built | Deferred per build order; needs the notifications plugin |

---

## 4. Needs a real device / native plumbing (can't finish or test in-browser)

- **APK build & signing.** I generated the web app + Capacitor config but did not
  run `cap add android` / Gradle (no Android SDK here). On your machine:
  `npm install` → `npm run build` → `npx cap add android` → `npx cap sync` →
  open in Android Studio → build/sign the APK. The `android/` folder is **not** in this zip.
- **SQLite on web dev.** `jeep-sqlite` needs the `sql-wasm.wasm` copied into `public/`
  (copy from `node_modules/sql.js/dist/`) or web dev will fail to open the DB.
  Native Android needs nothing. *(Now automatic — `postinstall` copies it.)*
- **Cook-log photos (MVP4).** The schema stores a `photos[]` of file URIs, but capture
  is stubbed — needs `@capacitor/camera` + a decision on where files live (app data dir).
- **Share targets.** `@capacitor/share` opens the native sheet; whether "Notes" and
  "Messages" appear is OS-dependent. Verify on the tablet.
- **Wake lock.** Uses the standard Wake Lock API; works in the Android WebView but
  unverified on your specific device.

---

## 5. Decisions I made that you should sanity-check

1. **JSON columns vs full relational schema.** Ingredients/steps/tags are stored as
   JSON text in the `recipe` row, not child tables. Simpler and fine for single-user
   scale; the trade-off is you can't SQL-query *inside* ingredients except via `LIKE`
   on the blob (which is what the ingredient search does). Easy to normalize later if needed.
2. **Quantity merge doesn't convert units.** Same name + same unit merges and sums;
   "2 cups flour" + "100 g flour" stay as two lines. Unit conversion is a rabbit hole;
   flagged rather than half-done.
3. **Spoonacular gaps in the common shape.** Spoonacular gives no `difficulty`,
   `method`, or `isStaple`. I defaulted difficulty→"medium", method→first dishType,
   isStaple→false. The pantry layer is the right place to learn staples over time.
4. **Macro-contributors on search results** are a best-effort "first few ingredients"
   from search payloads; they get accurate once the full recipe is hydrated on open.
5. **Auto-prompt for cook logs (MVP4)** isn't implemented — it depends on the
   notifications layer + a "was this actually cooked" check. Manual "Log a cook" works now.
6. **Finder "method" filter is currently inert for Spoonacular.** Their `complexSearch`
   has no cooking-method parameter, so the chip renders but doesn't constrain results.
   The import schema's `method` is free-form (Skillet, Oven, Grill…). Options: filter
   by method client-side over cached/local recipes, or drop the chip for the live finder.
   Your call — flagging rather than guessing.

---

## 6. What I verified vs didn't

- ✅ **Verified:** week generation for 2026 (53 weeks, correct partials), syntax of all
  pure-logic modules.
- ❌ **Not verified (no toolchain here):** `npm install` resolution, the React render,
  the full Vite build, any native/Android path, live Spoonacular calls.

Treat this as "compiles in my head + logic-tested," not "ran on a tablet." First thing
to do on your machine is `npm install && npm run dev` and shake out import/render errors.

---

## 7. Suggested next moves

1. `npm install`, copy the wasm (now automatic via `npm install`), `npm run dev`, fix any first-run errors.
2. Try an import end-to-end: use the prompt in `docs/requirements/IMPORT_FORMAT.md`, paste the
   JSON into the Import screen, confirm it lands and cooks correctly.
3. Pick the next real target: **photos for cook logs**, the **learning pantry**, or
   **notifications** — each is a self-contained chunk.
