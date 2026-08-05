import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { aiProcessingAllowed, visibleTo } from "@/lib/privacy";
import { recipeSource } from "@/lib/recipeSource";
import { enforceUserAiQuota } from "@/lib/aiQuota";
import { fetchWithTimeout } from "@/lib/outbound";
import { API_LIMITS, boundedStringList, boundedText, isHttpUrl, optionalBoundedText } from "@/lib/apiLimits";
import { InvalidRequestBodyError, objectBody, readJsonBody } from "@/lib/requestSecurity";

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
  instructions: string | null,
  useAi: boolean
): Promise<string[]> {
  if (!useAi) return fallbackKeywords(title, ingredients);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallbackKeywords(title, ingredients);
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  try {
    const res = await fetchWithTimeout(
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
      },
      15_000,
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
  let body: Record<string, unknown> | null;
  try {
    body = objectBody(await readJsonBody(req, API_LIMITS.recipeJsonBytes));
  } catch (error) {
    if (error instanceof InvalidRequestBodyError) return NextResponse.json({ error: "Recipe data is missing or too large." }, { status: 413 });
    throw error;
  }
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

  const cleanTitle = boundedText(title, API_LIMITS.title);
  const cleanIngredients = optionalBoundedText(ingredients, API_LIMITS.ingredientText);
  const cleanInstructions = optionalBoundedText(instructions, API_LIMITS.instructionText);
  const cleanNotes = optionalBoundedText(notes, API_LIMITS.notes);
  if (!cleanTitle) {
    return NextResponse.json({ error: "Recipe names must be between 1 and 160 characters." }, { status: 400 });
  }
  if (cleanIngredients === undefined || cleanInstructions === undefined || cleanNotes === undefined) {
    return NextResponse.json({ error: "One or more recipe text fields are too long." }, { status: 400 });
  }

  const normalizedSource = recipeSource(typeof source === "string" ? source : null);
  const recipeBookId = normalizedSource !== "personal" && typeof bookId === "string" ? bookId : null;
  if (recipeBookId) {
    const book = await prisma.book.findFirst({
      where: { id: recipeBookId, householdId: identity.membership.householdId, ...visibleTo(identity) },
      select: { id: true },
    });
    if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const cleanLinks = boundedStringList(links ?? [], { maximumItems: 10, maximumLength: API_LIMITS.link });
  const cleanTags = boundedStringList(tags ?? [], { maximumItems: 15, maximumLength: API_LIMITS.tag, lowercase: true });
  if (!cleanLinks || cleanLinks.some((link) => !isHttpUrl(link))) return NextResponse.json({ error: "Recipe links must be valid HTTP(S) URLs." }, { status: 400 });
  if (!cleanTags) return NextResponse.json({ error: "Add no more than 15 tags of 40 characters each." }, { status: 400 });
  if (bookId !== undefined && bookId !== null && (typeof bookId !== "string" || bookId.length > API_LIMITS.identifier)) return NextResponse.json({ error: "Invalid cookbook." }, { status: 400 });
  if (pageRef !== undefined && pageRef !== null && (typeof pageRef !== "number" || !Number.isInteger(pageRef) || pageRef < 1 || pageRef > API_LIMITS.page)) return NextResponse.json({ error: "Enter a valid page number." }, { status: 400 });

  const aiEnabled = aiProcessingAllowed(identity) && Boolean(process.env.GEMINI_API_KEY);
  const aiQuota = aiEnabled ? await enforceUserAiQuota(identity.user.id) : null;
  const keywords = await extractKeywords(
    cleanTitle,
    cleanIngredients,
    cleanInstructions,
    aiEnabled && Boolean(aiQuota?.allowed)
  );

  const recipe = await prisma.recipe.create({
    data: {
      title: cleanTitle,
      source: normalizedSource,
      bookId: recipeBookId,
      pageRef:
        normalizedSource !== "personal" && typeof pageRef === "number" ? pageRef : null,
      ingredients: cleanIngredients,
      instructions: cleanInstructions,
      notes: cleanNotes,
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
