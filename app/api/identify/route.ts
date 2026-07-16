import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

const PROMPT = `Look at this photo of food. Identify the dish.

Rules:
- Return ONLY a JSON object, no prose, no markdown fences.
- Schema: { "dish": string, "ingredients": string[], "isFood": boolean }
- "dish" is your best guess at the dish name (e.g. "potato gratin", "spaghetti bolognese"). Keep it short.
- "ingredients" is 3-8 main visible ingredients, lowercase, singular where natural.
- "isFood" is false if the photo does not show food or a meal.`;

type Identified = { dish: string; ingredients: string[]; isFood: boolean };

async function identify(
  data: string,
  mimeType: string
): Promise<Identified | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const models = Array.from(
    new Set([
      process.env.GEMINI_MODEL || "gemini-flash-latest",
      "gemini-flash-latest",
      "gemini-flash-lite-latest",
    ])
  );

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: PROMPT },
                  { inline_data: { mime_type: mimeType, data } },
                ],
              },
            ],
            generationConfig: {
              response_mime_type: "application/json",
              temperature: 0,
            },
          }),
        }
      );
      if (res.status === 429 || res.status === 404) continue;
      if (!res.ok) continue;
      const json = await res.json();
      const text: string | undefined =
        json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;
      const parsed = JSON.parse(text.replace(/^```(json)?|```$/g, "").trim());
      if (parsed && typeof parsed.dish === "string") {
        return {
          dish: parsed.dish.trim(),
          ingredients: Array.isArray(parsed.ingredients)
            ? parsed.ingredients
                .filter((i: unknown) => typeof i === "string")
                .map((i: string) => i.trim().toLowerCase())
                .slice(0, 8)
            : [],
          isFood: parsed.isFood !== false,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

export async function POST(req: Request) {
  const body = await req.json();
  const data: string | undefined = body?.data;
  const mimeType: string | undefined = body?.mimeType;
  if (!data || !mimeType?.startsWith("image/")) {
    return NextResponse.json({ error: "Image required" }, { status: 400 });
  }
  if (Buffer.from(data, "base64").length > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large" }, { status: 400 });
  }

  const result = await identify(data, mimeType);
  if (!result) {
    return NextResponse.json(
      { error: "Couldn't identify the dish" },
      { status: 502 }
    );
  }
  if (!result.isFood) {
    return NextResponse.json({ dish: null, ingredients: [], matches: [] });
  }

  const dishWords = result.dish
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const terms = Array.from(new Set([...result.ingredients, ...dishWords]));

  const matches = await prisma.recipe.findMany({
    where: {
      OR: [
        { title: { contains: result.dish, mode: "insensitive" } },
        ...dishWords.map((w) => ({
          title: { contains: w, mode: "insensitive" as const },
        })),
        { keywords: { hasSome: terms } },
        { tags: { hasSome: terms } },
      ],
    },
    include: { book: { select: { title: true } } },
    take: 5,
  });

  return NextResponse.json({
    dish: result.dish,
    ingredients: result.ingredients,
    matches: matches.map((m) => ({
      id: m.id,
      title: m.title,
      source: m.source,
      bookTitle: m.book?.title ?? null,
      pageRef: m.pageRef,
    })),
  });
}
