export const FISH_AND_SEAFOOD = "fish-and-seafood";

const exclusionTerms: Record<string, string[]> = {
  [FISH_AND_SEAFOOD]: [
    "anchovy", "barramundi", "bass", "bream", "calamari", "carp", "caviar",
    "clam", "cod", "crab", "fish", "haddock", "halibut", "herring", "lobster",
    "mackerel", "mussel", "octopus", "oyster", "prawn", "salmon", "sardine",
    "scallop", "sea bass", "seafood", "shellfish", "shrimp", "squid", "tilapia",
    "trout", "tuna", "whitebait",
  ],
};

export function normalizeFoodExclusion(value: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  if (["fish", "seafood", "fish and seafood"].includes(cleaned)) return FISH_AND_SEAFOOD;
  return cleaned.length >= 2 ? cleaned : null;
}

function termsFor(exclusion: string) {
  const preset = exclusionTerms[exclusion];
  if (preset) return preset;
  const singular = exclusion.endsWith("s") ? exclusion.slice(0, -1) : exclusion;
  return singular === exclusion ? [exclusion] : [exclusion, singular];
}

export function matchesFoodExclusions(values: Array<string | null | undefined>, exclusions: string[]) {
  const text = values.filter((value): value is string => Boolean(value)).join(" ").toLowerCase();
  return exclusions.some((exclusion) => termsFor(exclusion).some((term) => text.includes(term)));
}

export function recipeIsExcluded(
  recipe: { title: string; ingredients?: string | null; tags?: string[]; keywords?: string[] },
  exclusions: string[]
) {
  return matchesFoodExclusions([recipe.title, recipe.ingredients, ...(recipe.tags ?? []), ...(recipe.keywords ?? [])], exclusions);
}
