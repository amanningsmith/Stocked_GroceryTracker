# Implementation Notes

Notes about the implementation and where to look in the app code.

- Core logic lives in `src/lib/` (weeks, shoppingList, overlap, sections, validateImport).
- DB wrapper: `src/db/db.js` and schema in `src/db/schema.js`.
- Spoonacular client + normalizer: `src/api/spoonacular.js`.

If you move the app into `recipe-project/app/`, ensure `public/` contains the
`sql-wasm.wasm` binary for the web fallback.
