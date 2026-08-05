import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { aiProcessingAllowed } from "@/lib/privacy";
import { fetchUrlSafely } from "@/lib/safeFetch";
import { extractJsonLdRecipe, extractPageTitle, stripHtmlToText } from "@/lib/htmlRecipe";
import { extractRecipe } from "@/lib/recipeExtraction";
import { aiQuotaResponse, enforceUserAiQuota } from "@/lib/aiQuota";
import { InvalidRequestBodyError, objectBody, readJsonBody } from "@/lib/requestSecurity";
import { enforceRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const maxDuration = 30;

export async function POST(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const importLimit = await enforceRateLimit({ namespace: "import:url", identifier: identity.user.id, limit: 30, windowMs: 60 * 60 * 1000 });
  if (!importLimit.allowed) return rateLimitResponse(importLimit);

  let body: Record<string, unknown> | null;
  try {
    body = objectBody(await readJsonBody(req, 16 * 1024));
  } catch (error) {
    if (error instanceof InvalidRequestBodyError) return NextResponse.json({ error: "Paste a valid recipe link." }, { status: 400 });
    throw error;
  }
  const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
  if (!rawUrl) return NextResponse.json({ error: "Paste a recipe link first" }, { status: 400 });

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "That doesn't look like a valid link" }, { status: 400 });
  }

  let html: string;
  try {
    const result = await fetchUrlSafely(parsedUrl.toString());
    html = result.text;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Couldn't open that link" },
      { status: 422 }
    );
  }

  const structured = extractJsonLdRecipe(html);
  if (structured && (structured.ingredients || structured.instructions)) {
    return NextResponse.json({
      title: structured.title ?? extractPageTitle(html),
      ingredients: structured.ingredients,
      instructions: structured.instructions,
      notes: structured.notes,
      tags: [],
      isRecipe: true,
    });
  }

  if (!aiProcessingAllowed(identity)) {
    return NextResponse.json(
      { error: "Marvin couldn't find a recipe on that page, and AI processing is off in your privacy controls." },
      { status: 422 }
    );
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "Marvin couldn't find a structured recipe on that page, and AI extraction is not configured." }, { status: 503 });
  }

  const quota = await enforceUserAiQuota(identity.user.id);
  if (!quota.allowed) return aiQuotaResponse(quota);

  const text = stripHtmlToText(html).slice(0, 40000);
  if (text.length < 20) {
    return NextResponse.json({ error: "That page doesn't seem to have any readable text" }, { status: 422 });
  }

  const result = await extractRecipe({ text });
  if (!result) {
    return NextResponse.json({ error: "Couldn't read a recipe from that link" }, { status: 502 });
  }
  if (!result.isRecipe) {
    return NextResponse.json({ error: "That doesn't look like a recipe page" }, { status: 422 });
  }
  return NextResponse.json({ ...result, title: result.title ?? extractPageTitle(html) });
}
