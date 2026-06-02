# Changelog — June 1, 2026

## Session Overview
Feature session implementing bulk recipe import with mixed feed display, source filtering, and deletion capabilities.

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
