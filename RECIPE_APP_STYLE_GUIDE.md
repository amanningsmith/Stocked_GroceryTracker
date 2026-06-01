# Recipe App — Style Guide (v1, Locked)

**Direction:** "Cozy & defined" (Option B) — white cards lifting off a warm cream page with a soft, defined edge. Warm cookbook feel, minimal, a few gentle animations.
**Theme:** Fixed **light/cream** (no dark mode in v1).
**Pairs with:** `RECIPE_APP_MVP_REQUIREMENTS_v2.md`, `RECIPE_IMPORT_FORMAT.md`
**Date:** May 30, 2026

---

## Color Palette

Four-color warm system (cream · espresso · terracotta · sage) plus derived neutrals.

| Token | Hex | Role |
|---|---|---|
| `bg-page` | `#FBF4E9` | App background (warm cream) |
| `bg-card` | `#FFFFFF` | Card / row surface (lifts off the cream) |
| `text-primary` | `#3A2E26` | Headings + body (espresso) |
| `text-secondary` | `#8A7B6E` | Metadata, muted labels (warm taupe) |
| `text-hint` | `#A89B8C` | Placeholder text, disabled |
| `accent` | `#C65D3B` | Terracotta — primary accent, active states, favorited heart |
| `accent-strong` | `#B0502E` | Button fills + text-on-light (darker terracotta for AA contrast) |
| `accent-dark` | `#9A4023` | Text on terracotta tint |
| `accent-tint` | `#F6E3DA` | Active chip / terracotta tag background |
| `secondary` | `#7C8654` | Sage — secondary accent, success, secondary tags |
| `secondary-dark` | `#4A512F` | Text on sage tint |
| `secondary-tint` | `#E9EDDC` | Sage tag background |
| `border-hairline` | `#ECE3D5` | Card borders, dividers |
| `border-chip` | `#E3D8C8` | Inactive filter chip outline |
| `icon-inactive` | `#C9BCAB` | Unselected icons (favorite, add) |

**Contrast note:** use `accent-strong` (`#B0502E`), not `accent`, behind white button text. `accent` is fine for icons, borders, and large display use.

---

## Typography

| Use | Font | Weight / Size |
|---|---|---|
| Recipe names, headings | **Fraunces** (serif) | 500 · 16–22px |
| Body, metadata, UI, buttons | **DM Sans** (sans) | 400/500 · 11–15px |

- Both load from Google Fonts. Fallbacks: `Fraunces, Georgia, serif` and `DM Sans, system-ui, sans-serif`.
- Sentence case everywhere. Two weights only (400 / 500).
- Minimum font size 11px (used only for pills/tags).

---

## Elevation & Shape

- **Card shadow (resting):** `0 3px 10px rgba(58,46,38,0.10)`
- **Card shadow (hover/press):** `0 6px 16px rgba(58,46,38,0.15)`
- Shadows are **espresso-tinted**, never neutral gray — keeps them warm.
- **Hairline border:** `1px solid #ECE3D5` on every card/row (this is what makes it "defined" vs. floating).
- **Corner radius:** cards/rows `12px` · thumbnails/inputs `9–10px` · pills `999px`.

---

## Spacing

- Card interior padding: `11–14px`
- Gap between stacked rows: `10px`
- Page padding: `16–18px`
- Component-internal gaps: `6 / 8 / 12px`

---

## Animation (a few, purposeful — never bouncy)

| Moment | Motion | Spec |
|---|---|---|
| Card / row tap | Gentle lift | `transform: translateY(-2px)` + shadow grow, `0.18s ease` |
| Recipe list load | Soft fade-in | opacity 0→1, `0.25s ease`, slight stagger |
| Cooking-mode step change | Horizontal slide | `0.22s ease` |
| Shopping-list check-off | Fill + strike | terracotta fill, `0.15s ease` |
| Button press | Subtle scale | `scale(0.98)` |

No spinners-as-decoration, no parallax, no continuous motion.

---

## Core Components

### Recipe row (Finder — MVP1)
Compact, info-dense, defined row-card:
- 54px thumbnail (recipe photo; imported = cream tile with cuisine initial in Fraunces)
- Recipe name (Fraunces 16, espresso)
- Meta line: `cuisine · time · difficulty` (DM Sans 13, secondary)
- Macro-contributor tags: sage-tint and terracotta-tint pills
- Right rail: favorite heart (terracotta when active, `icon-inactive` otherwise) + add-to-week icon
- Imported recipes carry a small "imported" pill

### Filter chips
Pills. Active = `accent-tint` bg + `accent-dark` text. Inactive = `border-chip` outline + `text-secondary`.

### Buttons
- Primary: `accent-strong` fill, white text, radius 9px.
- Secondary: transparent, `accent` border + text.

### Tags
Sage-tint or terracotta-tint pills, 11px, dark-shade text from the same family.

### Imported fallback thumbnail
No-photo recipes show a cream tile (`bg-page` + hairline) with the cuisine's first letter in Fraunces, `text-secondary`.

### Shopping list item (MVP3)
Row with a terracotta check control, item name + merged quantity, section header grouping (sage label), and a have/need toggle.

### Cooking-mode step (MVP6)
Full ingredient list always visible; selected step highlights its ingredients (terracotta-tint highlight). Large tap targets, espresso-on-cream, manual timer chips.

---

## Carry-over conventions

- **Units:** imperial default.
- **Imported recipes:** no photo → cuisine-initial fallback tile (above).
- **Fixed light theme:** all colors are absolute (no light/dark switching) — the app owns its palette regardless of device setting.

---

*Locked v1. This is the visual contract for the build. Adjustable later: the green/brown-vs-terracotta balance can be pushed warmer or cooler by shifting how often `accent` vs `secondary` appears.*
