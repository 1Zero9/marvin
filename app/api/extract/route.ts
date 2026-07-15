import { NextResponse } from "next/server";

export const maxDuration = 60;

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

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
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

  const parts = [
    { text: PROMPT },
    ...images.map((img) => ({
      inline_data: { mime_type: img.mimeType || "image/jpeg", data: img.data },
    })),
  ];

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
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Gemini error:", res.status, err.slice(0, 500));
    return NextResponse.json(
      { error: `Extraction failed (${res.status})` },
      { status: 502 }
    );
  }

  const data = await res.json();
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return NextResponse.json(
      { error: "No extraction result returned" },
      { status: 502 }
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^```(json)?|```$/g, "").trim());
  } catch {
    return NextResponse.json(
      { error: "Could not parse extraction result" },
      { status: 502 }
    );
  }

  const entries: Entry[] = (Array.isArray(parsed) ? parsed : [])
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
