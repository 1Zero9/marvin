import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { decodeImage } from "@/lib/images";
import { aiProcessingAllowed } from "@/lib/privacy";

export const maxDuration = 60;

const PROMPT = `Create a clearly-labelled, editable best-guess recipe draft from this photo of a finished dish.

Rules:
- Return ONLY a JSON object, no prose or markdown fences.
- Schema: { "title": string, "ingredients": string, "instructions": string, "notes": string, "tags": string[], "isFood": boolean }.
- This is an estimate, not a transcription. Do not claim to know exact ingredients, quantities, cooking times, temperatures, or steps from the image.
- Suggest a plausible, simple home-cook version of the visible dish. Use practical estimated quantities and put one ingredient per line.
- Write 3-7 short method steps, one per paragraph. State sensible assumptions rather than presenting them as facts.
- In notes, begin exactly: "AI draft from a photo — check every ingredient, amount and step before cooking." Then add any important uncertainty about the dish.
- Use 0-4 short lowercase tags.
- Set "isFood" to false if this is not clearly a finished dish or meal.
- Do not make allergy, nutrition, medical, or safety claims.`;

type RecipeDraft = {
  title: string;
  ingredients: string;
  instructions: string;
  notes: string;
  tags: string[];
  isFood: boolean;
};

async function createDraft(
  data: string,
  mimeType: string,
  titleHint: string
): Promise<RecipeDraft | null> {
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
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: `${PROMPT}\n\nPossible dish name from the person: ${titleHint || "No hint provided"}` },
                { inline_data: { mime_type: mimeType, data } },
              ],
            }],
            generationConfig: { response_mime_type: "application/json", temperature: 0.35 },
          }),
        }
      );
      if (res.status === 429 || res.status === 404) continue;
      if (!res.ok) continue;
      const json = await res.json();
      const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;
      const parsed = JSON.parse(text.replace(/^```(json)?|```$/g, "").trim());
      if (parsed && typeof parsed.title === "string") {
        const requiredNote = "AI draft from a photo — check every ingredient, amount and step before cooking.";
        const notes = typeof parsed.notes === "string" ? parsed.notes.trim().slice(0, 3000) : "";
        return {
          title: parsed.title.trim().slice(0, 160),
          ingredients: typeof parsed.ingredients === "string" ? parsed.ingredients.trim().slice(0, 12000) : "",
          instructions: typeof parsed.instructions === "string" ? parsed.instructions.trim().slice(0, 16000) : "",
          notes: notes.startsWith(requiredNote) ? notes : `${requiredNote}${notes ? `\n\n${notes}` : ""}`,
          tags: Array.isArray(parsed.tags)
            ? parsed.tags.filter((tag: unknown): tag is string => typeof tag === "string").map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 4)
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
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!aiProcessingAllowed(identity)) return NextResponse.json({ error: "AI processing is off in your privacy controls." }, { status: 403 });

  const body = await req.json();
  const image = decodeImage(body?.data, body?.mimeType);
  if (!image || typeof body?.data !== "string") {
    return NextResponse.json({ error: "A photo is required" }, { status: 400 });
  }
  if (image.buffer.length > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "That photo is too large" }, { status: 413 });
  }
  const titleHint = typeof body?.titleHint === "string" ? body.titleHint.trim().slice(0, 160) : "";
  const draft = await createDraft(body.data, image.mimeType, titleHint);
  if (!draft) return NextResponse.json({ error: "Couldn't make a recipe draft from that photo" }, { status: 502 });
  if (!draft.isFood) return NextResponse.json({ error: "That doesn’t look like a finished dish Marvin can turn into a recipe." }, { status: 422 });
  return NextResponse.json(draft);
}
