import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aiProcessingAllowed, visibleTo } from "@/lib/privacy";
import { aiQuotaResponse, enforceUserAiQuota } from "@/lib/aiQuota";
import { fetchWithTimeout } from "@/lib/outbound";

type Swap = { original: string; swap: string; reason: string; impactLevel: "low" | "medium" | "high" };

function cleanSwaps(value: unknown): Swap[] {
  if (!Array.isArray(value)) return [];
  const impactLevels = new Set<Swap["impactLevel"]>(["low", "medium", "high"]);
  const seen = new Set<string>();
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;
    const original = typeof candidate.original === "string" ? candidate.original.trim().slice(0, 120) : "";
    const swap = typeof candidate.swap === "string" ? candidate.swap.trim().slice(0, 160) : "";
    const reason = typeof candidate.reason === "string" ? candidate.reason.trim().slice(0, 240) : "";
    const impactLevel = typeof candidate.impactLevel === "string" ? candidate.impactLevel.toLowerCase() : "";
    if (!original || !swap || !reason || !impactLevels.has(impactLevel as Swap["impactLevel"])) return [];
    const key = `${original.toLowerCase()}|${swap.toLowerCase()}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ original, swap, reason, impactLevel: impactLevel as Swap["impactLevel"] }];
  }).slice(0, 6);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!aiProcessingAllowed(identity)) return NextResponse.json({ error: "AI processing is off in your privacy controls." }, { status: 403 });
  const { id } = await params;
  const recipe = await prisma.recipe.findFirst({
    where: { id, householdId: identity.membership.householdId, ...visibleTo(identity) },
    select: { id: true, title: true, ingredients: true, instructions: true },
  });
  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  if (!recipe.ingredients && !recipe.instructions) {
    return NextResponse.json({ error: "Add ingredients or a method before looking for lighter options." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Recipe lightening is not configured." }, { status: 503 });
  const quota = await enforceUserAiQuota(identity.user.id);
  if (!quota.allowed) return aiQuotaResponse(quota);
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  try {
    const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      cache: "no-store",
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Suggest up to six practical, optional ways to make this recipe lighter while keeping it recognisably the same meal. Consider ingredients and cooking methods. Do not give medical advice, make health claims, or mention calories. If there are no credible changes, return an empty list. Return ONLY a JSON array. Each object must have original, swap, reason, and impactLevel (low, medium, or high).\n\nRecipe: ${recipe.title}\nIngredients:\n${(recipe.ingredients ?? "Not provided").slice(0, 5000)}\n\nMethod:\n${(recipe.instructions ?? "Not provided").slice(0, 5000)}` }] }],
        generationConfig: { response_mime_type: "application/json", temperature: 0.35 },
      }),
    }, 25_000);
    if (!response.ok) return NextResponse.json({ error: "Couldn’t get lighter options just now." }, { status: 502 });
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("") ?? "";
    const suggestions = cleanSwaps(JSON.parse(text));
    if (suggestions.length === 0) return NextResponse.json({ error: "No useful lighter options came back. Try again later." }, { status: 422 });

    await prisma.recipeSwapSuggestion.upsert({
      where: { userId_recipeId: { userId: identity.user.id, recipeId: recipe.id } },
      update: { suggestions, generatedAt: new Date() },
      create: { userId: identity.user.id, recipeId: recipe.id, suggestions },
    });
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ error: "Couldn’t get lighter options just now." }, { status: 502 });
  }
}
