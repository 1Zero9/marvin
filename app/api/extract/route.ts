import { NextResponse } from "next/server";

export const maxDuration = 120;

const PROMPT = `You are reading photographs of a cookbook's back-of-book index.
Extract every index entry visible into JSON.

Rules:
- Return ONLY a JSON array, no prose, no markdown fences.
- Schema: [{ "ingredient": string, "dish": string, "page": number }]
- "ingredient" is the index heading the dish appears under (e.g. "aubergine"). Lowercase it.
- "dish" is the dish/recipe name as printed.
- "page" is the page number as an integer. If a range is given, use the first page.
- If a dish appears under multiple ingredient headings, output one object per heading.
- Skip cross-references like "see also".`;

type Entry = { ingredient: string; dish: string; page: number };

type Part =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

async function callGemini(parts: Part[], apiKey: string): Promise<Entry[] | null> {
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
            contents: [{ parts }],
            generationConfig: {
              response_mime_type: "application/json",
              temperature: 0,
            },
          }),
          signal: AbortSignal.timeout(45_000),
        }
      );
      if (!res.ok) {
        console.error("Gemini error:", model, res.status);
        continue;
      }
      const data = await res.json();
      const text: string | undefined =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;
      const parsed = JSON.parse(text.replace(/^```(json)?|```$/g, "").trim());
      if (Array.isArray(parsed)) return parsed as Entry[];
    } catch (e) {
      console.error("Gemini attempt failed:", model, (e as Error).message);
      continue;
    }
  }
  return null;
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const body = await req.json();
  const images: { data: string; mimeType: string }[] = body?.images ?? [];
  if (!Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: "No images provided" }, { status: 400 });
  }
  if (images.length > 10) {
    return NextResponse.json({ error: "Max 10 images" }, { status: 400 });
  }

  const parts: Part[] = [
    { text: PROMPT },
    ...images.map((img) => ({
      inline_data: { mime_type: img.mimeType || "image/jpeg", data: img.data },
    })),
  ];

  const parsed = await callGemini(parts, apiKey);
  if (!parsed) {
    return NextResponse.json(
      { error: "Extraction failed — try that photo again." },
      { status: 502 }
    );
  }

  const entries: Entry[] = parsed
    .filter(
      (e): e is Entry =>
        e &&
        typeof e.ingredient === "string" &&
        typeof e.dish === "string" &&
        Number.isFinite(Number(e.page))
    )
    .map((e) => ({
      ingredient: e.ingredient.trim().toLowerCase(),
      dish: e.dish.trim(),
      page: Math.round(Number(e.page)),
    }));

  return NextResponse.json({ entries });
}
