function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&deg;/g, "°");
}

export function stripHtmlToText(html: string): string {
  const withoutJunk = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const withBreaks = withoutJunk
    .replace(/<\/(p|div|li|tr|h[1-6]|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");
  const text = withBreaks.replace(/<[^>]+>/g, " ");
  return decodeEntities(text)
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

function textOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textOf).filter(Boolean).join("\n");
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.name === "string") return obj.name;
  }
  return "";
}

function flattenJsonLd(node: unknown, out: Record<string, unknown>[]) {
  if (Array.isArray(node)) {
    node.forEach((item) => flattenJsonLd(item, out));
    return;
  }
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  if (obj["@graph"]) flattenJsonLd(obj["@graph"], out);
  out.push(obj);
}

function isRecipeNode(node: Record<string, unknown>) {
  const type = node["@type"];
  if (typeof type === "string") return type.toLowerCase() === "recipe";
  if (Array.isArray(type)) return type.some((t) => typeof t === "string" && t.toLowerCase() === "recipe");
  return false;
}

export type StructuredRecipe = {
  title: string | null;
  ingredients: string;
  instructions: string;
  notes: string;
};

/**
 * Looks for schema.org Recipe structured data (JSON-LD) in a page's HTML.
 * This is the fast, free path used before falling back to AI text extraction.
 */
export function extractJsonLdRecipe(html: string): StructuredRecipe | null {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scripts) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1].trim());
    } catch {
      continue;
    }
    const nodes: Record<string, unknown>[] = [];
    flattenJsonLd(parsed, nodes);
    const recipe = nodes.find(isRecipeNode);
    if (!recipe) continue;

    const title = typeof recipe.name === "string" ? recipe.name.trim() : null;

    const ingredientsRaw = recipe.recipeIngredient ?? recipe.ingredients;
    const ingredients = Array.isArray(ingredientsRaw)
      ? ingredientsRaw.filter((i): i is string => typeof i === "string").join("\n")
      : textOf(ingredientsRaw);

    const instructionsRaw = recipe.recipeInstructions;
    let instructions = "";
    if (Array.isArray(instructionsRaw)) {
      instructions = instructionsRaw
        .map((step) => {
          if (typeof step === "string") return step;
          if (step && typeof step === "object") {
            const stepObj = step as Record<string, unknown>;
            if (Array.isArray(stepObj.itemListElement)) {
              return stepObj.itemListElement.map(textOf).filter(Boolean).join("\n");
            }
            return textOf(stepObj.text ?? stepObj.name ?? "");
          }
          return "";
        })
        .filter(Boolean)
        .join("\n");
    } else {
      instructions = textOf(instructionsRaw);
    }

    const notes = typeof recipe.description === "string" ? recipe.description.trim() : "";

    if (!ingredients.trim() && !instructions.trim()) continue;
    return {
      title,
      ingredients: decodeEntities(ingredients).trim(),
      instructions: decodeEntities(instructions).trim(),
      notes: decodeEntities(notes).trim(),
    };
  }
  return null;
}

export function extractPageTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  const title = decodeEntities(match[1]).replace(/\s+/g, " ").trim();
  return title || null;
}
