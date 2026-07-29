type ParsedIngredient = { ingredient: string; quantity: string | null };

const quantityStart = /^(\d+(?:\s+\d+\/\d+|[./]\d+)?|½|¼|¾|⅓|⅔)(?:\s*(?:g|kg|ml|l|tbsp|tsp|cups?|oz|lbs?|tins?|cans?|cloves?|slices?|packets?|bunches?|heads?))?\s+(.+)$/i;

function parseIngredient(line: string): ParsedIngredient | null {
  const trimmed = line.replace(/^\s*[-*•]\s*/, "").replace(/\s+/g, " ").trim();
  if (!trimmed || trimmed.length > 240 || /^[a-z][a-z &/-]{1,50}:$/i.test(trimmed)) return null;
  const match = quantityStart.exec(trimmed);
  if (!match) return { ingredient: trimmed.slice(0, 160), quantity: null };
  return { ingredient: match[2].trim().slice(0, 160), quantity: match[1].trim().slice(0, 60) || null };
}

function keyFor(ingredient: string) {
  return ingredient.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function mergedQuantity(current: string | null, next: string | null) {
  if (!current) return next;
  if (!next || current === next) return current;
  return `${current} + ${next}`.slice(0, 60);
}

// Recipe ingredient text is free-form, so aggregation intentionally stays
// conservative: it only merges lines that clearly name the same ingredient.
export function shoppingItemsFromIngredients(ingredientTexts: Array<string | null>) {
  const items = new Map<string, ParsedIngredient>();
  for (const text of ingredientTexts) {
    for (const line of (text ?? "").split(/\r?\n/)) {
      const parsed = parseIngredient(line);
      if (!parsed?.ingredient) continue;
      const key = keyFor(parsed.ingredient);
      if (!key) continue;
      const existing = items.get(key);
      items.set(key, existing
        ? { ingredient: existing.ingredient, quantity: mergedQuantity(existing.quantity, parsed.quantity) }
        : parsed);
    }
  }
  return [...items.values()];
}
