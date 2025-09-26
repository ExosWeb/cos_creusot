// Central category configuration and normalization
// Canonical keys are stored in CANONICAL_CATEGORIES.
// Aliases map alternative slugs (e.g. 'avantages') to canonical ('prestations').

const CANONICAL_CATEGORIES = [
  'general',
  'prestations',
  'voyages',
  'retraites',
  'evenements'
];

// Aliases: key = alias used in old links or UI, value = canonical category
const CATEGORY_ALIASES = {
  avantages: 'prestations', // legacy
  prestation: 'prestations', // singular fallback
  activites: 'prestations' // possible alternate label
};

function normalizeCategory(input) {
  if (!input) return null;
  const lower = String(input).toLowerCase();
  if (CANONICAL_CATEGORIES.includes(lower)) return lower;
  if (CATEGORY_ALIASES[lower]) return CATEGORY_ALIASES[lower];
  return null; // invalid
}

// Return array of DB category values that correspond to the canonical category
// e.g. prestations => ['prestations','avantages','prestation','activites'] (if still present in DB)
function expandCategoryForQuery(input) {
  const canonical = normalizeCategory(input);
  if (!canonical) return [];
  const matches = new Set([canonical]);
  // Include any alias keys that map to this canonical value (DB may still have legacy rows)
  Object.entries(CATEGORY_ALIASES).forEach(([alias, target]) => {
    if (target === canonical) matches.add(alias);
  });
  return Array.from(matches);
}

module.exports = {
  CANONICAL_CATEGORIES,
  CATEGORY_ALIASES,
  normalizeCategory,
  expandCategoryForQuery
};
