// SQLite schema — mirrors the data model in RECIPE_APP_SPEC_FINAL.md §3.
// Arrays/objects (ingredients, steps, dietaryTags, macroContributors, photos,
// fromRecipes, adjustments) are stored as JSON text columns and parsed in the
// data layer. This keeps the schema flat and readable; the app is single-user
// and small, so full relational normalization isn't worth the complexity here.

export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS recipe (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,              -- "spoonacular" | "imported"
    name TEXT NOT NULL,
    image TEXT,
    cuisine TEXT,
    method TEXT,
    totalTimeMinutes INTEGER,
    protein TEXT,
    dietaryTags TEXT,                  -- JSON string[]
    difficulty TEXT,
    servings INTEGER,
    macroContributors TEXT,            -- JSON string[]
    description TEXT,
    tip TEXT,                          -- one pro tip (import schema; "" if none)
    ingredients TEXT,                  -- JSON Ingredient[]
    steps TEXT,                        -- JSON Step[]
    cachedAt INTEGER                   -- epoch ms; protects Spoonacular quota
  );`,

  `CREATE TABLE IF NOT EXISTS favorite (
    recipeId TEXT PRIMARY KEY,
    addedAt INTEGER NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS week (
    id TEXT PRIMARY KEY,
    year INTEGER NOT NULL,
    weekNumber INTEGER NOT NULL,
    startDate TEXT NOT NULL,           -- ISO date
    endDate TEXT NOT NULL,
    isPartial INTEGER NOT NULL         -- 0 | 1
  );`,

  `CREATE TABLE IF NOT EXISTS meal_entry (
    id TEXT PRIMARY KEY,
    weekId TEXT NOT NULL,
    date TEXT NOT NULL,                -- ISO date of the specific day
    slot TEXT NOT NULL,               -- "lunch" | "dinner"
    recipeId TEXT NOT NULL,           -- '__custom__' for manually entered meals
    servings INTEGER NOT NULL DEFAULT 2,
    customTitle TEXT,                  -- only set when recipeId = '__custom__'
    customIngredients TEXT             -- JSON string[] for custom meal ingredients
  );`,

  `CREATE TABLE IF NOT EXISTS shopping_line (
    id TEXT PRIMARY KEY,
    weekId TEXT NOT NULL,
    name TEXT NOT NULL,
    mergedQty REAL,
    unit TEXT,
    section TEXT,
    status TEXT NOT NULL DEFAULT 'need', -- "need" | "have"
    fromRecipes TEXT,                    -- JSON string[]
    source TEXT NOT NULL DEFAULT 'recipe' -- "recipe" | "pantry" | "manual"
  );`,

  `CREATE TABLE IF NOT EXISTS pantry_item (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    section TEXT,
    buyQty REAL,
    lifespanWeeks REAL,
    lastPurchased TEXT,               -- ISO date
    level REAL                        -- 0..1 estimated remaining
  );`,

  `CREATE TABLE IF NOT EXISTS cook_log (
    id TEXT PRIMARY KEY,
    recipeId TEXT NOT NULL,
    dateMade TEXT NOT NULL,
    rating INTEGER,                   -- 1..5
    notes TEXT,
    adjustments TEXT,
    photos TEXT                       -- JSON string[] (file URIs)
  );`,

  // Settings live in Capacitor Preferences, not SQLite (Spoonacular key, units, etc.).
];

// ALTER TABLE migrations for existing installs. Wrapped in try/catch at runtime
// so re-runs on repeated app opens don't crash ("duplicate column" is swallowed).
export const MIGRATIONS = [
  `ALTER TABLE meal_entry ADD COLUMN customTitle TEXT`,
  `ALTER TABLE meal_entry ADD COLUMN customIngredients TEXT`,
];
