import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { decodeImage } from "@/lib/images";
import { aiProcessingAllowed } from "@/lib/privacy";
import { aiQuotaResponse, enforceUserAiQuota } from "@/lib/aiQuota";
import { fetchWithTimeout } from "@/lib/outbound";
import { InvalidRequestBodyError, objectBody, readJsonBody } from "@/lib/requestSecurity";
import { logServerWarning, requestIdFrom } from "@/lib/serverLog";

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

async function callGemini(parts: Part[], apiKey: string, requestId: string | undefined): Promise<Entry[] | null> {
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
        30_000,
      );
      if (!res.ok) {
        logServerWarning("index_extract.provider_response", new Error("Provider response was not successful"), { requestId, model, status: res.status });
        continue;
      }
      const data = await res.json();
      const text: string | undefined =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;
      const parsed = JSON.parse(text.replace(/^```(json)?|```$/g, "").trim());
      if (Array.isArray(parsed)) return parsed as Entry[];
    } catch (e) {
      logServerWarning("index_extract.provider_failed", e, { requestId, model });
      continue;
    }
  }
  return null;
}

export async function POST(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!aiProcessingAllowed(identity)) return NextResponse.json({ error: "AI processing is off in your privacy controls." }, { status: 403 });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 }
    );
  }

  let body: Record<string, unknown> | null;
  try {
    body = objectBody(await readJsonBody(req, 70 * 1024 * 1024));
  } catch (error) {
    if (error instanceof InvalidRequestBodyError) return NextResponse.json({ error: "Images are missing or too large." }, { status: 413 });
    throw error;
  }
  const images: { data?: string; mimeType?: string }[] = Array.isArray(body?.images)
    ? body.images
    : [];
  if (!Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: "No images provided" }, { status: 400 });
  }
  if (images.length > 10) {
    return NextResponse.json({ error: "Max 10 images" }, { status: 400 });
  }
  const validImages = images.flatMap((image) => {
    const decoded = decodeImage(image?.data, image?.mimeType);
    return decoded && typeof image.data === "string"
      ? [{ data: image.data, mimeType: decoded.mimeType }]
      : [];
  });
  if (validImages.length !== images.length) {
    return NextResponse.json({ error: "Images must be valid JPEG, PNG, or WebP files under 5 MB." }, { status: 400 });
  }
  const quota = await enforceUserAiQuota(identity.user.id, validImages.length);
  if (!quota.allowed) return aiQuotaResponse(quota);

  const parts: Part[] = [
    { text: PROMPT },
    ...validImages.map((img) => ({
      inline_data: { mime_type: img.mimeType || "image/jpeg", data: img.data },
    })),
  ];

  const parsed = await callGemini(parts, apiKey, requestIdFrom(req));
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
      ingredient: e.ingredient.trim().toLowerCase().slice(0, 160),
      dish: e.dish.trim().slice(0, 300),
      page: Math.round(Number(e.page)),
    }))
    .filter((entry) => entry.ingredient && entry.dish && entry.page > 0 && entry.page <= 100_000)
    .slice(0, 5_000);

  return NextResponse.json({ entries });
}
