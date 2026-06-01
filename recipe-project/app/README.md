# Recipe App

Personal recipe app — Capacitor + React + on-device SQLite, Android tablet APK.
See `GAPS.md` for build status and open items. Specs live in the project docs.

## Stack
React 18 + Vite · Capacitor 6 (Android) · `@capacitor-community/sqlite` ·
Spoonacular API (key in Settings) · fixed cream/light theme.

## Run (web dev)
```bash
npm install            # auto-copies the SQLite wasm into public/
npm run dev
```
Then set your Spoonacular key in **Settings** inside the app.

**Getting it onto the tablet (USB/wifi) is in [`SETUP.md`](./SETUP.md)** — `npm run push`
gives you live-reload on the device.

## Build the Android APK
```bash
npm run build
npx cap add android      # first time only
npx cap sync
npx cap open android     # build + sign in Android Studio
```

## Project layout
```
src/
  styles/   tokens.css (locked palette/type) + base.css
  db/       schema.js (spec §3) + db.js (SQLite wrapper, web fallback)
  api/      spoonacular.js (client + normalizer -> common recipe shape)
  lib/      weeks.js · shoppingList.js · overlap.js · sections.js · validateImport.js
  state/    store.js (repository layer over the DB)
  components/  Nav · RecipeRow · AddToWeek
  screens/  Finder · Favorites · RecipeDetail · Week · Shopping · Cooking · Import · Settings · Pantry
```

## Notes
- All recipes (Spoonacular + imported) normalize to one shape, so the card,
  shopping logic, and cooking screen don't care about the source.
- Fetched Spoonacular recipes are cached into SQLite to protect the free-tier quota.
- No in-app AI, no Anthropic key. Imported recipes are pasted JSON validated on entry.

## Docs
- [`SETUP.md`](./SETUP.md) — device setup + edit→tablet workflow
- [`VSCODE.md`](./VSCODE.md) — opening in VS Code, tasks, debugging
- [`TESTING.md`](./TESTING.md) — master prompt to build the test suite + manual device checklist
- [`GAPS.md`](./GAPS.md) — build status, stubs, open decisions
- [`docs/RECIPE_IMPORT_FORMAT.md`](./docs/RECIPE_IMPORT_FORMAT.md) — import JSON schema
```
