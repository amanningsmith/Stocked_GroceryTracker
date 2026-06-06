# Changelog — June 1, 2026

## Session Overview
Feature session implementing bulk recipe import with mixed feed display, source filtering, and deletion capabilities.

---

## June 5, 2026

### 18. Shopping list — manual item add + pantry recycling
**Purpose:** Let users add one-off items to the shopping list and optionally track them as pantry staples that auto-appear on future weeks' lists when it's time to restock  
**Date:** June 5, 2026  
**Files Modified:** `app/src/components/AddShoppingItem.jsx` (new), `app/src/screens/ShoppingScreen.jsx`, `app/src/state/store.js`

#### Changes:
- **"+ Add item" button** in ShoppingScreen opens a modal for adding a free-text shopping item
- Modal fields: item name (required), qty + unit (optional), store section dropdown
- **"Also save to pantry" toggle** (pill switch) — when on, reveals a "Restock every X weeks" input and shows a live "next restock approx. Jun 20" preview
- On save: inserts a `shopping_line` immediately (appears without needing a rebuild); if pantry toggle was on, also inserts a `pantry_item` with `lastPurchased = today` and the entered lifespan
- **Pantry recycling**: `regenerate()` now calls `pantryItemsDueInWeek(startDate, endDate)` — for each pantry item it computes `lastPurchased + lifespanWeeks × 7 days` and includes it in the rebuild if the restock date falls within that week's range. So pantry staples reappear automatically on the correct week's shopping list
- Pantry-sourced lines get a small "PANTRY" badge in the list so the user knows why they appeared
- `regenerate` and `loadOrBuild` now receive the full week object (not just `weekId`) to avoid an extra DB lookup for `startDate`/`endDate`

---

### 17. FinderScreen — session cache + Hide API recipes filter
**Purpose:** Stop the Find tab from re-fetching the API every time the user switches back to it; add a filter to hide Spoonacular results  
**Date:** June 5, 2026  
**Files Modified:** `app/src/screens/FinderScreen.jsx`

#### Changes:
- **Session cache**: module-level `_cache` variable stores the last result set. On mount, if cache is populated (tab was visited before), results restore instantly from cache — no API call, no flicker. Cache is invalidated only on full page reload.
- **No auto-refresh**: `useEffect` now only calls `run(true, true)` when `_cache` is null (first mount). Tab switches back restore from cache.
- **Search button only**: API is called on Search button press or Enter. Tab switches never trigger it.
- **Hide API recipes**: new checkbox in the Filters panel hides all `source = 'spoonacular'` results from display. Works alongside the existing "Hide imported" toggle. Both are display-only filters — the underlying `results` state stays unfiltered so toggling doesn't require a new search.
- Removed the `hideImported` filter that was incorrectly applied inside `run()`, causing imported recipes to disappear from state until the next search. Filtering is now exclusively in `displayResults`.

---

### 15. Custom manual meals on the Week tab
**Purpose:** Let users add meals without a recipe — just a title and a list of ingredients that auto-populate the grocery list  
**Date:** June 5, 2026  
**Files Modified:** `app/src/components/AddCustomMeal.jsx` (new), `app/src/screens/WeekScreen.jsx`, `app/src/screens/ShoppingScreen.jsx`, `app/src/state/store.js`, `app/src/db/schema.js`, `app/src/db/db.js`

#### Changes:
- Each day card in WeekScreen now has a **+** button in the top-right that opens an "Add custom meal" modal
- Modal: meal title input, day picker (pre-filled from the clicked day), lunch/dinner slot selector, ingredient chip builder (type + Enter or "Add", × to remove)
- On save: inserts a `meal_entry` with `recipeId = '__custom__'`, writes ingredients directly to `shopping_line` for immediate appearance in the grocery list
- "Rebuild from week" in ShoppingScreen also picks up custom meal ingredients so they survive a full rebuild
- WeekScreen displays custom meals with a brown initial-avatar and shows ingredient count ("3 ingredients") instead of servings
- **Schema**: `meal_entry` gains `customTitle TEXT` and `customIngredients TEXT` (JSON) columns; `db.js` runs ALTER TABLE migrations with try/catch so existing installs upgrade safely

---

### 14. Bug fix — calendar date picker saves to the day before (timezone)
**Purpose:** Fix off-by-one when adding a recipe via the date picker for users in negative UTC offsets (US timezones)  
**Date:** June 5, 2026  
**Files Modified:** `app/src/screens/WeekScreen.jsx`, `app/src/components/AddToWeek.jsx`

#### Root cause:
`new Date(isoDate + 'T00:00:00Z').toLocaleDateString()` interprets UTC midnight in local time. In UTC-4 (Eastern Summer), "2026-06-07T00:00:00Z" is June 6 at 8 PM local, so the day label showed "Saturday Jun 6" for the slot that stored date `"2026-06-07"`. When the user picked Jun 6 in the picker, the meal saved as `"2026-06-06"` and appeared on the previous day.

#### Fix:
Added `timeZone: 'UTC'` to every `toLocaleDateString` call that displays an ISO date. Day headers, week-range labels, and the week indicator in Add to Week now all show the correct calendar date regardless of local timezone.

---

### 16. FinderScreen — session cache + Hide API recipes filter
**Purpose:** Stop the Find tab from re-fetching the API every time the user switches back to it; add a filter to hide Spoonacular results  
**Date:** June 5, 2026  
**Files Modified:** `app/src/screens/FinderScreen.jsx`

#### Changes:
- **Session cache**: module-level `_cache` variable stores the last result set. On mount, if cache is populated (tab was visited before), results restore instantly from cache — no API call, no flicker. Cache is invalidated only on full page reload.
- **No auto-refresh**: `useEffect` now only calls `run(true, true)` when `_cache` is null (first mount). Tab switches back restore from cache.
- **Search button only**: API is called on Search button press or Enter. Tab switches never trigger it.
- **Hide API recipes**: new checkbox in the Filters panel hides all `source = 'spoonacular'` results from display. Works alongside the existing "Hide imported" toggle. Both are display-only filters — the underlying `results` state stays unfiltered so toggling doesn't require a new search.
- Removed the `hideImported` filter that was incorrectly applied inside `run()`, causing imported recipes to disappear from state until the next search. Filtering is now exclusively in `displayResults`.

---

## June 2, 2026

### 13. FavoritesScreen — full filter parity with FinderScreen
**Purpose:** All 6 filter categories + search + overlap sort on the Saved tab  
**Date:** June 2, 2026  
**Files Modified:** `app/src/screens/FavoritesScreen.jsx`

#### Changes:
- Added text search input (filters instantly client-side, no Search button needed)
- Added all 6 filter categories: Cuisine, Protein, Method, Diet, Meal type, Max time
- Active filter pills above results — tap any to remove; "Clear all" link
- Filter toggle button with active count badge (same style as FinderScreen)
- Overlap sort checkbox: loads current week's recipes once on mount, sorts synchronously in render
- Result count line: "12 saved recipes" / "3 of 12 recipes" when filters active
- Empty state messages: no favorites yet vs no matches for current filters
- All filtering is **in-memory** — no API calls, instant response

#### Key difference from FinderScreen:
- FinderScreen calls Spoonacular on search; FavoritesScreen filters the already-loaded `all` array via `applyFilters()`
- Diet filter normalizes stored `'gluten-free'` vs filter option `'gluten free'` by stripping hyphens/spaces before comparing

---

### 12. AddToWeek — calendar date picker with auto week detection
**Purpose:** Let users pick any day from a calendar and auto-resolve the correct week  
**Date:** June 2, 2026  
**Files Modified:** `app/src/components/AddToWeek.jsx`

#### Changes:
- Replaced the `<select>` dropdown (limited to current week's days) with `<input type="date">` — native calendar picker, any date, any year
- On every date change: calls `currentWeek(year, date)` which auto-creates the year's weeks via `ensureWeeks` if needed, then queries the DB for the containing week
- Week label shown immediately below the picker: "**Week 23** · Jun 1 – Jun 7" — user sees exactly which week they're adding to before committing
- Add button disabled while resolving (debounced by the async resolve call)
- Resolving/not-found states handled with inline feedback text
- Imports simplified: `currentWeek` from weeks.js (which already calls `ensureWeeks` internally) — no extra DB imports needed

#### Why:
- Old UI forced users to only pick days from the current week — couldn't plan ahead or add to past weeks
- `currentWeek(year, date)` already existed and handles any date / any year, just wasn't wired to a free date input
- Native `<input type="date">` renders the OS calendar picker on mobile (iOS/Android) — no library needed

---

### 11. Feature List — 6 items from featureList.md
**Purpose:** Complete feature list: warm palette revert, mono icons, API auto-search, multiple meals, settings restyle, filter rework  
**Date:** June 2, 2026  
**Files Modified:** `index.html`, `tokens.css`, `base.css`, `Nav.jsx`, `FinderScreen.jsx`, `WeekScreen.jsx`, `SettingsScreen.jsx`

#### 1. UI Colors — warm palette restored (tokens.css, base.css, index.html)
- Restored original style guide: `--bg-page: #FBF4E9`, `--text-primary: #3A2E26` espresso, `--accent: #C65D3B` terracotta
- Fraunces serif restored for h1/h2/h3 (600 weight); DM Sans 400/500/600 for body
- Forest green kept as complement: chip active states, input focus ring
- Warm layered shadows, warm card gradient restored
- `--radius-input` back to 10px (not Instacart pill)

#### 2. Icons mono-color (Nav.jsx)
- Replaced emoji icons (🔍🛒🗓♥⚙) with inline SVG Feather-style icons
- All icons use `stroke="currentColor"` — inherit active/inactive CSS color exactly
- No emoji color bleed; renders correctly and identically on all platforms
- Active indicator bar (terracotta) slides in at top edge

#### 3. API auto-runs on open (FinderScreen.jsx)
- Removed `if (text || filters)` guard — API now fires on every `run()` call
- Mount auto-load: calls Spoonacular once per day (date stored in Preferences key `finder_auto_date`)
- On subsequent opens same day: loads cached Spoonacular recipes from SQLite (zero quota cost)
- Added `listRecipes` import for daily cache fallback
- Added `Preferences` import from `@capacitor/preferences`

#### 4. Filter UI rework (FinderScreen.jsx)
- Each filter category now uses a horizontally scrollable strip (`.scroll-x` class, no-scrollbar)
- Active filters shown as removable terracotta pills above results — tap any to deactivate
- "Clear all" link when filters are active
- Filter toggle button shows active count badge in terracotta
- Checkboxes (overlap sort, hide imported) consolidated into a single row inside details

#### 5. Multiple meals per slot (WeekScreen.jsx)
- `mealAt()` replaced with `mealsAt()` returning array — all meals per date+slot rendered
- Each slot can hold salad + main dish + anything else without limit
- Each entry shows thumbnail (or gradient placeholder) + name + servings + remove button
- Slot label shown once above the list of entries; "— add from Find" only when slot is empty

#### 6. Settings restyle + user profile (SettingsScreen.jsx)
- Added profile section: avatar (tap-to-change, stored as base64 in Preferences), name, email
- Avatar fallback: Fraunces initial letter on terracotta tint, same pattern as recipe cards
- Flash toast replaces per-button saved state (shared, appears briefly after any save)
- Section labels: uppercase 11px gray headers (like iOS settings)
- Import / Pantry rows use `.settings-row` class with consistent border separators
- API key section includes quota explanation copy

---

### 10. Images — bigger thumbnails, gradient placeholders, hero detail, auto-fetch
**Purpose:** Make the app visually richer with images everywhere recipes appear  
**Date:** June 2, 2026  
**Files Modified:** `app/src/lib/colorUtil.js` (new), `app/src/components/RecipeRow.jsx`, `app/src/screens/RecipeDetailScreen.jsx`, `app/src/screens/WeekScreen.jsx`, `app/src/api/spoonacular.js`, `app/src/screens/FinderScreen.jsx`

#### Changes:

**colorUtil.js (new):**
- `placeholderGradient(name)` — deterministic vibrant gradient from recipe name hash
- 8 colors: emerald, amber, tomato, grape, ocean, gold, teal, brick
- Same recipe always gets the same color — stable across renders

**RecipeRow.jsx:**
- Thumbnail: 54px → 80px, border-radius 10 → 12
- Placeholder: replaced plain gray letter tile with colorful gradient + bold white initial
- Badge label: "spoonacular" shortened to "API" to avoid overflow

**RecipeDetailScreen.jsx:**
- Hero image: fixed 16:9 aspect ratio (was variable height), objectFit cover
- Hero fallback: full-width gradient banner + 🍽️ emoji when no image
- Back and favorite buttons now float over the hero as pill overlays
- Content area gets its own padding; screen padding removed to let hero bleed edge-to-edge
- Tip card: updated from secondary-tint to accent-tint (green)
- Textarea border-radius: 12px (overrides pill radius for multi-line fields)

**WeekScreen.jsx:**
- Loads `recipeData` (name + image) instead of just names
- Each meal slot shows a 40×40 rounded thumbnail (image or gradient placeholder)
- Day labels: weight 700 (was font-display)
- Slot rows get a top hairline border for definition

**spoonacular.js:**
- New `fetchImageForName(name)` — complexSearch with number=1, returns first image URL
- Silent catch — returns null on quota/network failure, never throws

**FinderScreen.jsx:**
- `open()`: if imported recipe has no image, fires `fetchImageForName` async (non-blocking)
- Result saved via `saveRecipe` so next view shows the fetched image — 1 API call, then cached forever

#### Why:
- 54px thumbnails were too small to be visually useful; 80px gives Instacart-like card weight
- Plain gray letter placeholders made imported recipes look unfinished
- Detail hero was variable height and choppy; fixed 16:9 is clean and cinematic
- Week planner had no images at all — hard to scan visually
- Auto-image fetch addresses featureList.md request without bulk API calls (lazy, 1 call per recipe on first open)

---

### 9. UI Redesign — Instacart-inspired: clean white + vibrant green
**Purpose:** Overhaul visual language to match Instacart's clean, modern grocery app feel  
**Date:** June 2, 2026  
**Files Modified:** `app/index.html`, `app/src/styles/tokens.css`, `app/src/styles/base.css`, `app/src/components/Nav.jsx`

#### Changes:

**index.html:**
- Removed Fraunces serif font
- Switched to DM Sans 400/600/700 only (clean, modern sans-serif)

**tokens.css:**
- Background: `#F4F5F7` (Instacart light gray, was warm parchment)
- Cards: pure `#FFFFFF` (was warm cream)
- Text: `#1C1C1C` near-black (was espresso brown)
- Accent: `#00A651` Instacart signature green (replaces terracotta AND forest)
- Removed all terracotta/warm color tokens — one green system now
- `--forest-*` and `--secondary-*` aliases point to same green for backward compat
- Shadows: clean neutral gray (no warm tint)
- `--radius-input: 24px` — pill-shaped inputs and buttons (Instacart style)
- `--font-display` set to DM Sans (was Fraunces)

**base.css:**
- `h1/h2/h3`: weight 700 (was 600/500 serif)
- Screen titles: 28px weight 700 (was 26px)
- Cards: flat white, no warm gradient, neutral clean shadow
- Pills: `tag-sage` → green badge (imported = our content), `tag-terra` → gray (external API source)
- Chips: Instacart green active state with green border
- Buttons: pill-shaped, flat green (was gradient), green box-shadow glow on hover
- Inputs: pill-shaped, green focus ring
- Base font size: 15px (was 14px) for better readability

**Nav.jsx:**
- Active color: Instacart green (--accent)
- Active font weight: 700
- Active indicator: small green dot below label (replaces top bar)
- Icon size: 22px (was 20px)

#### Why:
User requested Instacart-style UI — clean modern grocery app feel over the previous artisan/earthy aesthetic. Instacart's key signatures: white surfaces, neutral grays, vibrant green as the only accent, pill-shaped controls, bold sans-serif.

---

### 8. UI Redesign — Earthy forest green + elevated visual polish
**Purpose:** Elevate the overall UI with a richer palette and more crafted feel  
**Date:** June 2, 2026  
**Files Modified:** `app/src/styles/tokens.css`, `app/src/styles/base.css`, `app/src/components/Nav.jsx`

#### Changes:

**tokens.css:**
- Added full forest green palette: `--forest`, `--forest-strong`, `--forest-dark`, `--forest-tint`, `--forest-gradient`
- Deepened page background to `#F0E6CE` (richer parchment, was `#FBF4E9`)
- Warmed card surface to `#FFFDF7`
- Enriched sage: `--secondary` → `#5D7B49` (was `#7C8654`)
- Upgraded to layered double-shadow for `--shadow-rest` and `--shadow-hover`
- Increased `--radius-card` to 14px (was 12px)

**base.css:**
- Screen titles: 26px, weight 600, letter-spacing (was 22px/500)
- Cards: subtle warm gradient background (`bg-card` → warm cream), improved shadow
- `liftable:hover` added for desktop (`hover: hover` media query)
- `fadeIn` now includes a 5px upward drift for polish
- Chips: forest green active state (was terracotta)
- `btn-primary`: forest green gradient + shadow glow (was flat terracotta)
- `btn-secondary`: forest green border/color (was terracotta)
- Inputs: 1.5px border, forest green focus ring with 3px shadow halo
- Added `tag-forest` pill class

**Nav.jsx:**
- Active tab color → forest green (was terracotta)
- Active tab font weight → 600
- Added animated green indicator bar (3px, top edge, scale transition)
- Slightly more comfortable padding

#### Why:
- Terracotta was doing too much — primary actions AND favorites AND tags all in one color
- Forest green/espresso pairing is more grounded and food-appropriate than terracotta-dominant UI
- Terracotta stays on favorites (♥ hearts) and spoonacular tags — semantic warmth
- Layered shadows and card gradient add depth without adding visual noise

---

### 7. spoonacular.js — Full ingredients saved on favorite (no extra API calls)
**Purpose:** Save full ingredient data when a Spoonacular recipe is favorited  
**Date:** June 2, 2026  
**Files Modified:** `app/src/api/spoonacular.js`

#### Changes:
- `normalizeSearchResult` now populates the full `ingredients` array from `extendedIngredients` — same mapping logic as `normalizeRecipe` (name, amount, unit, section)
- Also extracts `description` from `r.summary` and `method` from `r.dishTypes` (previously omitted)
- `steps` remains `[]` in search results — populated on recipe open as before
- No new API calls: `extendedIngredients` is already returned by `complexSearch` when `addRecipeInformation: true` and `fillIngredients: true`

#### Why:
- Previously `normalizeSearchResult` only extracted ingredient names for `macroContributors` display, leaving `ingredients: []`
- Favoriting a search-result recipe saved that empty array to SQLite, so the recipe had no ingredients when viewed later
- User has 7 Spoonacular queries/day — fetching full recipe info on every favorite would burn quota fast
- Fix extracts the data that was already in the search response, costing zero extra quota

---

## Changes by Component

### 1. ImportScreen.jsx
**Purpose:** Enable bulk JSON recipe import  
**Date:** June 1, 2026  
**Files Modified:** `app/src/screens/ImportScreen.jsx`

#### Changes:
- Modified to accept both single recipe objects AND arrays of recipes
- Updated `check()` function to:
  - Parse JSON input (array or single recipe)
  - Normalize to array for batch processing
  - Validate each recipe individually with `validateImport()`
  - Generate unique `uid('imp')` for each recipe
  - Add `source: 'imported'` and `cachedAt` timestamp
  - Show import summary with success count and error/warning details
- Updated placeholder and title to reflect batch capability
- Added error/warning list display with truncation (shows first 10, indicates more)
- State tracking: `[imported]` stores newly imported recipes

#### Why:
User wanted to paste entire JSON arrays (30+ recipes) instead of one at a time. Batch import dramatically improves UX for bulk import workflows.

---

### 2. validateImport.js
**Purpose:** Accept recipes without explicit source field  
**Date:** June 1, 2026  
**Files Modified:** `app/src/lib/validateImport.js`

#### Changes:
- Removed requirement for `source: 'imported'` in input JSON
- ImportScreen now adds the source field after validation
- Other required fields remain: name, cuisine, method, totalTimeMinutes, servings, protein, dietaryTags, difficulty, description, ingredients[], steps[]
- Allows JSON to be pasted from external tools that don't include source field

#### Why:
External AI tools generating recipes don't necessarily include a source field. Validation should focus on recipe quality, not schema nitpicks. ImportScreen adds the source.

---

### 3. store.js
**Purpose:** Add functions to retrieve and delete imported recipes  
**Date:** June 1, 2026  
**Files Modified:** `app/src/state/store.js`

#### New Functions Added:
```javascript
export async function getImportedRecipes()
  // Retrieves all recipes with source='imported' from SQLite
  // Used by FinderScreen to always load imported recipes on init
  
export async function deleteRecipe(id)
  // Deletes recipe and cascades to:
  // - Removes favorite entries (favorite table)
  // - Removes meal entries (meal_entry table)
  // - Deletes recipe from recipe table
```

#### Why:
- `getImportedRecipes()`: Ensures imported recipes always appear in feed without requiring search
- `deleteRecipe()`: Allows users to remove imported recipes they no longer want, with proper cascade cleanup

---

### 4. FinderScreen.jsx
**Purpose:** Mix imported and Spoonacular results, add filter toggle  
**Date:** June 1, 2026  
**Files Modified:** `app/src/screens/FinderScreen.jsx`

#### Changes:
- Added import: `getImportedRecipes, deleteRecipe`
- Added state: `[hideImported, setHideImported]` boolean filter toggle
- Updated `run()` function:
  - Now ALWAYS calls `getImportedRecipes()` (loads imported recipes regardless of search)
  - Searches Spoonacular API only if text or filters are active
  - If text provided, also calls `searchLocal()` to find matching imported recipes
  - Merges both result sets, removes duplicates (prefers API version if ID matches)
  - Applies `hideImported` filter before rendering
  - Pagination preserved for API results

- Updated filter UI:
  - Added checkbox: "Hide imported recipes" (appears in Details collapsible)
  - Filter state updates displayed results instantly without new API calls

- Updated render:
  - Filters display based on `hideImported` state
  - Passes `onDelete={handleDelete}` to RecipeRow

- Added `handleDelete()` function:
  - Calls `deleteRecipe(recipeId)`
  - Removes recipe from displayed results
  - Catches errors and shows in error message

#### Why:
- Users want to see imported recipes alongside search results
- Mixed feed provides complete recipe discovery across all sources
- Filter allows users to hide imported (saves API quota if needed)
- Always loading imported recipes means they appear even without search

---

### 5. RecipeRow.jsx
**Purpose:** Display source badges and allow deletion  
**Date:** June 1, 2026  
**Files Modified:** `app/src/components/RecipeRow.jsx`

#### Changes:
- Added prop: `onDelete` callback function
- Added source badges in recipe name row:
  - `<span className="pill tag-sage">imported</span>` (green badge)
  - `<span className="pill tag-terra">spoonacular</span>` (tan badge)
- Added delete button (trash icon 🗑️):
  - Only renders for imported recipes (`recipe.source === 'imported'`)
  - Shows confirmation: "Delete this recipe?"
  - Stops event propagation on click
  - Uses red/inactive color

#### Why:
- Source badges let users instantly identify recipe origin
- Delete button only on imported recipes (API results are ephemeral)
- Confirmation prevents accidental deletion

---

### 6. FavoritesScreen.jsx
**Purpose:** Support deletion from favorites list  
**Date:** June 1, 2026  
**Files Modified:** `app/src/screens/FavoritesScreen.jsx`

#### Changes:
- Added import: `deleteRecipe`
- Added `handleDelete()` function:
  - Calls `deleteRecipe(recipeId)`
  - Reloads favorites list after deletion
- Updated RecipeRow render to pass `onDelete={handleDelete}`
- Error handling with console.error

#### Why:
- Users might favorite imported recipes and want to delete them from that screen too
- Maintains consistency across all recipe lists

---

## Database Impact

### No schema changes required
- All data maps to existing `recipe` table columns
- `source` field already exists (set to "spoonacular" for API results)
- `cachedAt` timestamp already tracked

### Cascade Delete Logic
When a recipe is deleted:
1. Removes from `favorite` table (if favorited)
2. Removes from `meal_entry` table (if added to meal plan)
3. Removes from `recipe` table (primary delete)

---

## User Workflows Enabled

### Workflow 1: Bulk Import
1. User goes to ImportScreen
2. Pastes JSON array with 30+ recipes (without source field)
3. Clicks "Validate & import"
4. Sees summary: "Imported 30 recipes" with any validation warnings
5. Recipes saved to local SQLite with source="imported"

### Workflow 2: Mixed Feed Browsing
1. User goes to FinderScreen
2. Imported recipes auto-load (no search needed)
3. User can search Spoonacular API normally
4. Results show both sources mixed together with badges
5. User can click "Hide imported recipes" to filter

### Workflow 3: Imported Recipe Management
1. User sees imported recipe in feed
2. Clicks trash icon 🗑️ to delete
3. Confirms deletion
4. Recipe removed from database and feed instantly

---

## Testing Checklist

- [ ] Import single recipe JSON → validates, saves with source="imported"
- [ ] Import array of 30 recipes → all validate, count displays correctly
- [ ] Import with validation errors → shows fatal errors, blocks import
- [ ] Import with warnings → imports succeed, shows warning list
- [ ] FinderScreen loads without search → imported recipes appear
- [ ] FinderScreen search mixes both sources → results show both types with badges
- [ ] Hide imported toggle → instantly filters out imported recipes
- [ ] Delete imported recipe → removes from feed, database, and favorites
- [ ] Delete recipe used in meal plan → removes from meal_entry table
- [ ] Favorite imported recipe → works normally, delete removes from favorites

---

## Files Modified

1. `app/src/screens/ImportScreen.jsx` — Bulk import UI
2. `app/src/lib/validateImport.js` — Remove source requirement
3. `app/src/state/store.js` — Add getImportedRecipes(), deleteRecipe()
4. `app/src/screens/FinderScreen.jsx` — Mix sources, add filter, delete handler
5. `app/src/components/RecipeRow.jsx` — Source badges, delete button
6. `app/src/screens/FavoritesScreen.jsx` — Delete support

**Total files modified: 6**

---

## Rollback Notes

If changes need to be reverted:
- No database schema changes (rollback safe)
- No breaking changes to existing APIs
- `source: 'imported'` recipes can coexist with 'spoonacular' recipes
- Delete logic safely cascades through related tables
- Feature flag: Could disable by setting `hideImported` default to true, or removing import loads

---

## Performance Considerations

- `getImportedRecipes()` queries SQLite directly (no network latency)
- Merging results is O(n) deduplication by Set
- Filter toggle is instant (no re-query)
- Delete cascades are efficient (indexed by foreign keys)
- Maximum display: 100 recipes per page (pagination preserved)

---

## Future Enhancements

- [ ] Bulk delete imported recipes (checkbox select all + delete button)
- [ ] Export imported recipes back to JSON
- [ ] Duplicate detection when importing
- [ ] Recipe edit functionality for imported recipes
- [ ] Tags/categories for organizing imported recipes
- [ ] Import history / undo last import
