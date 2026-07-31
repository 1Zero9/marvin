export type RecipeSource = "personal" | "book" | "hybrid";

export function recipeSource(value: string | null | undefined): RecipeSource {
  if (value === "book" || value === "hybrid") return value;
  return "personal";
}

export function recipeSourceLabel(value: string | null | undefined): string {
  switch (recipeSource(value)) {
    case "book":
      return "From a cookbook";
    case "hybrid":
      return "Adapted from a cookbook";
    default:
      return "My own recipe";
  }
}
