import { fetchWithTimeout } from "@/lib/outbound";

const PROMPT = `You are reading one or more photos of a recipe. It may be handwritten, a cookbook page, a magazine clipping, or a screenshot from a website or social media post.

Rules:
- Return ONLY a JSON object, no prose, no markdown fences.
- Schema: { "title": string or null, "ingredients": string, "instructions": string, "notes": string, "tags": string[], "isRecipe": boolean }
- "title" is the recipe name. null if there is no clear name.
- "ingredients" is the full ingredient list, one ingredient per line. Use metric quantities only: g, kg, ml, l and °C; teaspoons and tablespoons are fine for small quantities. Convert cups, fluid ounces, ounces, pounds, sticks and Fahrenheit to sensible metric approximations.
- "instructions" is the method, one step per paragraph, in order, faithful to the original wording. If the photos span multiple pages, merge them in order. Use Celsius for temperatures.
- "notes" captures any extra tips, serving suggestions, or margin notes. Empty string if none.
- "tags" is 0-4 short lowercase tags such as "quick", "veggie", "winter", "baking" if evident.
- "isRecipe" is false if the images do not contain a recipe.
- Do not invent quantities or steps that are not visible. If you convert a quantity, keep it a sensible approximation.`;

const TEXT_PROMPT = `You are reading raw pasted text of a recipe. It may be copied from a website, a message, an email, notes, or an exported document, and may include clutter such as ads, headers, comments, or unrelated text.

Rules:
- Return ONLY a JSON object, no prose, no markdown fences.
- Schema: { "title": string or null, "ingredients": string, "instructions": string, "notes": string, "tags": string[], "isRecipe": boolean }
- "title" is the recipe name. null if there is no clear name.
- "ingredients" is the full ingredient list, one ingredient per line. Use metric quantities only: g, kg, ml, l and °C; teaspoons and tablespoons are fine for small quantities. Convert cups, fluid ounces, ounces, pounds, sticks and Fahrenheit to sensible metric approximations.
- "instructions" is the method, one step per paragraph, in order, faithful to the original wording. Strip step numbers if present. Use Celsius for temperatures.
- "notes" captures any extra tips, serving suggestions, or asides. Empty string if none.
- "tags" is 0-4 short lowercase tags such as "quick", "veggie", "winter", "baking" if evident.
- "isRecipe" is false if the text does not contain a recipe.
- Ignore clutter that is not part of the recipe. Do not invent quantities or steps that are not present. If you convert a quantity, keep it a sensible approximation.

Text follows:
`;

export type ExtractedRecipe = {
  title: string | null;
  ingredients: string;
  instructions: string;
  notes: string;
  tags: string[];
  isRecipe: boolean;
};

export async function extractRecipe(
  input:
    | { images: { data: string; mimeType: string }[] }
    | { text: string }
): Promise<ExtractedRecipe | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const parts =
    "text" in input
      ? [{ text: TEXT_PROMPT + input.text }]
      : [
          { text: PROMPT },
          ...input.images.map((img) => ({
            inline_data: { mime_type: img.mimeType, data: img.data },
          })),
        ];
  const models = Array.from(
    new Set([
      process.env.GEMINI_MODEL || "gemini-flash-latest",
      "gemini-flash-latest",
      "gemini-flash-lite-latest",
    ])
  );

  for (const model of models) {
    try {
      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              response_mime_type: "application/json",
              temperature: 0,
            },
          }),
        },
        18_000,
      );
      if (!res.ok) continue;
      const json = await res.json();
      const text: string | undefined =
        json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;
      const parsed = JSON.parse(text.replace(/^```(json)?|```$/g, "").trim());
      if (parsed && typeof parsed === "object") {
        return {
          title: typeof parsed.title === "string" ? parsed.title.trim() : null,
          ingredients:
            typeof parsed.ingredients === "string" ? parsed.ingredients.trim() : "",
          instructions:
            typeof parsed.instructions === "string" ? parsed.instructions.trim() : "",
          notes: typeof parsed.notes === "string" ? parsed.notes.trim() : "",
          tags: Array.isArray(parsed.tags)
            ? parsed.tags
                .filter((t: unknown) => typeof t === "string")
                .map((t: string) => t.trim().toLowerCase())
                .slice(0, 4)
            : [],
          isRecipe: parsed.isRecipe !== false,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}
