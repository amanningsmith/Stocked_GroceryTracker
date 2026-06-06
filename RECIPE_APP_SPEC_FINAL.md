# Recipe App — Final Spec (v1, Locked & Buildable)

**Owner:** Manning · **Target:** Personal app, **Android tablet**, no paid hosting (fully on-device)
**Status:** Planning + design complete. All decisions locked. Ready to build.
**Date:** May 30, 2026
**Companion docs:** `RECIPE_IMPORT_FORMAT.md`, `RECIPE_APP_STYLE_GUIDE.md`
**Supersedes:** `RECIPE_APP_MVP_REQUIREMENTS_v2.md`

---

## 1. Vision

A personal, self-contained recipe app for a 2-person household: browse real recipes, plan them into weekly meal calendars, auto-generate a smart shopping list (grouped by store section, aware of what's already in the pantry), cook from a clean step-by-step screen, and remember how each meal went over time.

No backend, no hosting, no subscription. Everything runs on-device; the only network calls are to the Spoonacular recipe API.

---

## 2. Architecture & Platform (LOCKED)

| Area | Decision |
|---|---|
| Platform | Android tablet, sideloaded APK |
| Shell | **Capacitor** wrapping a **React** app (reuses web prototype + design system) |
| Storage | **On-device SQLite** (Capacitor SQLite plugin) — all user data |
| Recipe data | **Spoonacular API** (primary) + **Import** path for externally AI-generated recipes |
| AI in-app | **None.** The app never calls an LLM and holds no Anthropic key. AI recipes are generated elsewhere and pasted into the Import screen. |
| Keys | Spoonacular API key stored in app Settings. Single user. |
| Connectivity | Always online. Fetched recipes are **cached into SQLite** so re-browsing doesn't re-spend Spoonacular's free-tier daily quota. |
| Units | Imperial default |
| Theme | Fixed light/cream (see style guide). No dark mode in v1. |
| Notifications | `@capacitor/local-notifications` — local-only, no push server. Used for thaw reminders (Idea #2). No-op on web/dev. |

**Normalization layer:** Spoonacular responses are mapped into the same recipe shape as imported recipes (see `RECIPE_IMPORT_FORMAT.md`), so both sources are indistinguishable downstream — same card, same shopping logic, same cooking screen. Spoonacular's *analyzed instructions* endpoint provides per-step ingredients (for cooking-mode highlighting) and aisle data (for shopping-list grouping).

---

## 3. Data Model

```
Recipe        { id, source: "spoonacular"|"imported", name, image, cuisine,
                method, totalTimeMinutes, protein, dietaryTags[], difficulty,
                servings, macroContributors[], ingredients[], steps[] }
Ingredient    { name, amount, unit, section, isStaple }
Step          { number, instruction, ingredientRefs[] }
Favorite      { recipeId, addedAt }
Week          { id, year, weekNumber, startDate, endDate, isPartial }
MealEntry     { id, weekId, date, slot: "lunch"|"dinner", recipeId, servings,
                thawReminder: null|0|1,  -- null=heuristic, 0=off, 1=on
                notificationId: int|null }
ShoppingList  { id, weekId, lines[] }
ShoppingLine  { name, mergedQty, unit, section, status: "need"|"have",
                fromRecipes[], source: "recipe"|"pantry"|"manual" }
PantryItem    { id, name, section, buyQty, lifespanWeeks, lastPurchased, level }
CookLog       { id, recipeId, dateMade, rating(1-5), notes, adjustments, photos[] }
```

---

## 4. MVPs (LOCKED)

### MVP1 — Recipe Finder
- **Filters:** protein/meat type, cuisine, cooking method, total time, dietary tags, meal type, difficulty.
- **Search:** by name **and** ingredient.
- **Card:** image, name, time, protein, cuisine, **+ top 3–5 macro-contributor ingredients** (the protein/carb headliners, e.g. chicken + pasta — not spices).
- **Add to week:** defaults to **current week**; can manually pick a different week.
- **Recipe detail:** tapping a card opens the **full recipe**.
- **Volume:** load **100**, then **+100** per page.
- **Favorites:** persisted, browsable collection.

### MVP2 — Meal Weeks
- **Weeks:** Sun–Sat, anchored to the calendar year. Week 1 = Jan 1 → first Saturday (partial); then full Sun–Sat. For 2026 (Jan 1 = Thursday) this yields **~53 week entries** (first and last partial).
- **Assignment:** meals placed on **specific days** (powers the Calendar View, MVP-Idea #1).
- **Slots:** **Lunch + Dinner** per day.
- **Servings:** per meal, **max 4, default 2** — scales the shopping list.
- **Editing:** fully editable (add/remove/swap), past or future, from the calendar view.

### MVP3 — Weekly Shopping List + Learning Pantry
- **Generation:** auto-built from all recipes attached to a week.
- **Quantity merge:** combine same-ingredient amounts across recipes into one line.
- **Grouping:** by **store section**, standard order (Produce → Meat & Seafood → Dairy → Bakery → Dry & Canned → Spices → Frozen → Other), sourced from Spoonacular aisle data.
- **"Probably have":** driven by a **learning pantry** (see §5), not a static list.
- **Have/need toggle:** persists and feeds the pantry.
- **Export:** to **Notes** and to **Messages**.
- **Build note:** ship the core list first with a **static staples list**, then layer the learning pantry on top.

### MVP4 — Cooking History
- **Score:** 1–5. **Fields:** date made, rating, notes, **photos**, adjustments.
- **Surface:** in the **recipe detail** (history block) when the recipe is opened.
- **Trigger:** auto-prompt after the scheduled date; **defers** if the meal was skipped, prompting when actually cooked.
- Multiple entries per recipe; show average rating + latest notes/adjustments prominently.

### MVP5 — Sort by Shared Ingredients
- **Form:** a **sort mode** in the finder.
- **Ranking:** by **highest % ingredient overlap**.
- **Scope:** overlap measured **against recipes already in the current week**.
- Pantry staples ignored in scoring (weighted toward perishables) so matches reflect real shopping savings.

### MVP6 — Interactive Cooking Screen
- **Layout:** one screen ideal, **2 max** for large recipes (tablet-sized).
- **Timers:** **manual** (tag/start per step).
- **AI assist:** none.
- **Ingredients:** **full list always visible**; selecting a step **highlights the ingredients used in that step**.
- Screen stays awake (wake-lock), large tap targets, swipe + buttons.

---

## 5. Pantry Subsystem (folds into MVP3)

A dedicated **Pantry screen** where the user loads items and the app predicts restocks.

**Per item:** name, store section, typical **buy quantity**, typical **lifespan/buy frequency**, **last purchased**, current level.

**Restock prediction (two signals, both surfacing on the weekly list as accept/deny suggestions):**
1. **Time-based:** time since last purchase ≥ lifespan → suggest. *(Egg example: bought Week 1, 2-week lifespan → suggested Week 3.)*
2. **Usage-based (MVP-Idea #3):** cumulative recipe usage depletes the item → suggest.

Accepting a suggestion resets the item's "last purchased" clock.

---

## 6. Additional MVP Ideas (captured, post-core)

- **#1 — Calendar View:** the meal-planning surface for MVP2 (week/month grid, select a day to see its lunch/dinner). Ships *with* MVP2.
- **#2 — "Lay out the meat" notifications:** **active / building (Jun 6, 2026).** Native reminder the night before a planned meal needs thawing. Uses `@capacitor/local-notifications`; depends on MVP2.
  - **Trigger:** per-meal `thawReminder` flag. `null` = protein heuristic (beef, chicken, pork, turkey, lamb, fish, seafood, shrimp, duck); `0` = explicitly off; `1` = explicitly on.
  - **Fire time:** evening before the meal's date, user-configurable (default 20:00 local). No-op if fire time is already past.
  - **Lunch vs dinner:** both fire the night before in v1 (lunch morning-of reminder is a v2 gap).
  - **Web:** all plugin calls no-op on web/dev.
  - **v1 gaps:** multi-day thaw (large cuts), lunch morning-of reminder, bulk reschedule on time change.
- **#3 — Staple restock reminders:** usage-based pantry depletion alerts (see §5).

---

## 7. Recipe Import Format (summary)

Imported AI recipes use the fixed JSON schema in `RECIPE_IMPORT_FORMAT.md`. Key fields: `name, source:"imported", cuisine, method, totalTimeMinutes, servings, protein, dietaryTags[], difficulty, macroContributors[], description, ingredients[] {name, amount, unit, section, isStaple}, steps[] {number, instruction, ingredientRefs[]}, tip`. The doc includes a worked example and a copy-paste prompt for generating compliant recipes. Spoonacular recipes normalize into this same shape.

---

## 8. Visual Style (summary)

Full details in `RECIPE_APP_STYLE_GUIDE.md`. Direction: **"Cozy & defined"** — white cards with a soft, defined edge on a warm cream page; minimal, a few gentle animations.

- **Palette:** cream bg `#FBF4E9`, white cards `#FFFFFF`, espresso text `#3A2E26`, terracotta accent `#C65D3B` (`#B0502E` for button fills), sage secondary `#7C8654`, hairline `#ECE3D5`.
- **Type:** Fraunces (serif, recipe names/headings) + DM Sans (body/UI).
- **Elevation:** espresso-tinted soft shadow `0 3px 10px rgba(58,46,38,.10)` + 1px hairline border.
- **Animation:** gentle card lift, soft list fade-in, cooking-step slide, shopping-list check-off. Nothing bouncy.

---

## 9. Build Order

1. **Foundation** — Capacitor + React shell, SQLite schema (§3), Spoonacular integration + normalization layer, Import screen + validator.
2. **MVP1** — Finder + Favorites.
3. **MVP2 + Calendar View (Idea #1)** — meal weeks with the calendar planning surface.
4. **MVP3 (core)** — shopping list: merge + section grouping + static staples + export.
5. **MVP6** — Cooking Mode (independent of weeks; promotable earlier).
6. **MVP5** — ingredient-overlap sort.
7. **Pantry Subsystem** — upgrade static staples to the learning pantry + restock reminders (Idea #3).
8. **Notifications (Idea #2)** — lay-out-the-meat reminders. ← **ACTIVE (Jun 6, 2026)**
9. **MVP4** — cooking history.

---

*This is the locked v1 contract for the build. Everything here was decided with Manning across the planning sessions; the companion import and style docs hold the full detail.*
