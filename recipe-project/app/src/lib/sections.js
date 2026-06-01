// Store-section ordering (spec MVP3): the standard walk order for the shopping list.
export const SECTION_ORDER = [
  'Produce',
  'Meat & Seafood',
  'Dairy',
  'Bakery',
  'Dry & Canned',
  'Spices',
  'Frozen',
  'Other',
];

export function sectionRank(section) {
  const i = SECTION_ORDER.indexOf(section);
  return i === -1 ? SECTION_ORDER.length : i;
}

// Spoonacular returns free-text "aisle" strings (often semicolon-joined).
// Map them onto our fixed sections. Anything unmatched falls to "Other".
const AISLE_MAP = [
  [/produce|fresh herbs/i, 'Produce'],
  [/meat|seafood|fish/i, 'Meat & Seafood'],
  [/cheese|milk|egg|dairy|yogurt/i, 'Dairy'],
  [/bakery|bread/i, 'Bakery'],
  [/spices|seasoning/i, 'Spices'],
  [/frozen/i, 'Frozen'],
  [/canned|pasta|rice|baking|oil|vinegar|condiment|sauce|nut|dry|cereal|grain|pantry/i, 'Dry & Canned'],
];

export function aisleToSection(aisle) {
  if (!aisle) return 'Other';
  const first = String(aisle).split(';')[0];
  for (const [re, section] of AISLE_MAP) if (re.test(first)) return section;
  return 'Other';
}
