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

function containsTerm(value: string, term: string) {
  return value.toLowerCase().includes(term);
}

export function matchesFoodExclusions(values: Array<string | null | undefined>, exclusions: string[]) {
  const text = values.filter((value): value is string => Boolean(value)).join(" ").toLowerCase();
  return exclusions.some((exclusion) => (exclusionTerms[exclusion] ?? []).some((term) => containsTerm(text, term)));
}

export function recipeIsExcluded(
  recipe: { title: string; ingredients?: string | null; tags?: string[]; keywords?: string[] },
  exclusions: string[]
) {
  return matchesFoodExclusions([recipe.title, recipe.ingredients, ...(recipe.tags ?? []), ...(recipe.keywords ?? [])], exclusions);
}
