import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";

export const maxDuration = 30;

function fallbackKeywords(title: string, ingredients: string | null): string[] {
  const stop = new Set([
    "and", "the", "with", "for", "of", "a", "an", "in", "to", "or",
    "fresh", "large", "small", "chopped", "sliced", "diced", "tbsp",
    "tsp", "cup", "cups", "grams", "g", "kg", "ml", "oz",
  ]);
  const words = `${title} ${ingredients ?? ""}`
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w));
  return [...new Set(words)].slice(0, 20);
}

async function extractKeywords(
  title: string,
  ingredients: string | null,
  instructions: string | null
): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallbackKeywords(title, ingredients);
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Extract search keywords from this recipe: main ingredients, dish type, cuisine, cooking method. Lowercase, singular where natural. Return ONLY a JSON array of 5-15 strings, no prose.\n\nTitle: ${title}\nIngredients: ${ingredients ?? "n/a"}\nInstructions: ${(instructions ?? "n/a").slice(0, 1500)}`,
                },
              ],
            },
          ],
          generationConfig: { response_mime_type: "application/json" },
        }),
      }
    );
    if (!res.ok) return fallbackKeywords(title, ingredients);
    const data = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? "")
        .join("") ?? "";
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return fallbackKeywords(title, ingredients);
    const words = parsed
      .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
      .map((k) => k.trim().toLowerCase())
      .slice(0, 20);
    return words.length > 0 ? words : fallbackKeywords(title, ingredients);
  } catch {
    return fallbackKeywords(title, ingredients);
  }
}

export async function POST(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json();
  const {
    title,
    source,
    bookId,
    pageRef,
    ingredients,
    instructions,
    notes,
    tags,
    links,
    visibility,
  } = body ?? {};

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const cleanLinks = (Array.isArray(links) ? links : [])
    .filter((l): l is string => typeof l === "string")
    .map((l) => l.trim())
    .filter((l) => /^https?:\/\//.test(l))
    .slice(0, 10);

  const cleanTags = (Array.isArray(tags) ? tags : [])
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 15);

  const keywords = await extractKeywords(
    title.trim(),
    typeof ingredients === "string" ? ingredients : null,
    typeof instructions === "string" ? instructions : null
  );

  const recipe = await prisma.recipe.create({
    data: {
      title: title.trim(),
      source: source === "book" ? "book" : "personal",
      bookId: source === "book" && typeof bookId === "string" ? bookId : null,
      pageRef:
        source === "book" && typeof pageRef === "number" ? pageRef : null,
      ingredients: typeof ingredients === "string" ? ingredients || null : null,
      instructions:
        typeof instructions === "string" ? instructions || null : null,
      notes: typeof notes === "string" ? notes || null : null,
      tags: cleanTags,
      keywords,
      links: cleanLinks,
      householdId: identity.membership.householdId,
      createdById: identity.user.id,
      visibility: visibility === "household" ? "household" : "private",
    },
  });

  return NextResponse.json(recipe, { status: 201 });
}
