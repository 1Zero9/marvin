import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { decodeImage } from "@/lib/images";
import { privateMediaToken } from "@/lib/media";
import { visibleTo } from "@/lib/privacy";
import { API_LIMITS, boundedStringList, isHttpUrl, optionalBoundedText } from "@/lib/apiLimits";
import { readJsonObject } from "@/lib/requestSecurity";
import { enforceMediaUploadRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const maxDuration = 60;

const STOP_WORDS = new Set([
  "and", "the", "with", "for", "of", "a", "an", "in", "to", "or",
  "fresh", "large", "small", "chopped", "sliced", "diced",
]);

function keywordsFrom(title: string, ingredients: string[]): string[] {
  const titleWords = title
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return [...new Set([...ingredients, ...titleWords])].slice(0, 20);
}

export async function POST(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await readJsonObject(req, 8 * 1024 * 1024).catch(() => null);
  if (!body) return NextResponse.json({ error: "Meal details are missing or too large." }, { status: 413 });

  const recipeIdInput = typeof body?.recipeId === "string" ? body.recipeId : null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (recipeIdInput && recipeIdInput.length > API_LIMITS.identifier) return NextResponse.json({ error: "Invalid recipe." }, { status: 400 });
  if (title.length > API_LIMITS.title) return NextResponse.json({ error: "Dish names must be 160 characters or fewer." }, { status: 400 });
  const rating =
    typeof body?.rating === "number" && body.rating >= 1 && body.rating <= 5
      ? Math.round(body.rating)
      : null;
  const notes =
    typeof body?.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
  if (notes && notes.length > 2_000) return NextResponse.json({ error: "Meal notes must be 2,000 characters or fewer." }, { status: 400 });
  const context = body?.context === "out" ? "out" : "home";
  const countsAsCooked = body?.countsAsCooked !== false;
  const venue = optionalBoundedText(body?.venue, 120);
  if (venue === undefined) return NextResponse.json({ error: "Venue names must be 120 characters or fewer." }, { status: 400 });
  const link = typeof body?.link === "string" && body.link.trim()
    ? body.link.trim()
    : null;
  if (link && (link.length > 500 || !isHttpUrl(link, 500))) return NextResponse.json({ error: "Meal links must be valid HTTP(S) URLs." }, { status: 400 });
  const submittedTags = boundedStringList(body?.tags ?? [], { maximumItems: 12, maximumLength: API_LIMITS.tag, lowercase: true });
  if (!submittedTags) return NextResponse.json({ error: "Add no more than 12 short tags." }, { status: 400 });
  const tags = submittedTags.map((tag) => tag.replace(/^#/, "")).filter(Boolean);
  const instructions = typeof body?.instructions === "string" && body.instructions.trim()
    ? body.instructions.trim()
    : null;
  if (instructions && instructions.length > API_LIMITS.instructionText) return NextResponse.json({ error: "Instructions are too long." }, { status: 400 });
  const cookedAtValue = typeof body?.cookedAt === "string" || typeof body?.cookedAt === "number" ? body.cookedAt : null;
  const cookedAt = cookedAtValue !== null ? new Date(cookedAtValue) : new Date();
  if (Number.isNaN(cookedAt.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const ingredients = boundedStringList(body?.ingredients ?? [], { maximumItems: 10, maximumLength: 160, lowercase: true });
  if (!ingredients) return NextResponse.json({ error: "Add no more than 10 short ingredients." }, { status: 400 });
  const photo = body?.photo && typeof body.photo === "object" && !Array.isArray(body.photo)
    ? body.photo as Record<string, unknown>
    : null;
  const image = decodeImage(photo?.data, photo?.mimeType);
  const token = image ? privateMediaToken() : null;
  if (image && !token) return NextResponse.json({ error: "Private media is not configured" }, { status: 503 });
  if (image) {
    const rateLimit = await enforceMediaUploadRateLimit(identity.user.id);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  }

  let recipeId: string;
  let isNewRecipe = false;
  if (recipeIdInput) {
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeIdInput, householdId: identity.membership.householdId, archived: false, ...visibleTo(identity) },
    });
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }
    recipeId = recipe.id;
  } else {
    if (!title) {
      return NextResponse.json({ error: "Give the dish a name" }, { status: 400 });
    }
    const recipe = await prisma.recipe.create({
      data: {
        title,
        source: "personal",
        instructions,
        tags,
        keywords: keywordsFrom(title, ingredients),
        links: link ? [link] : [],
        instagramUrl: link && /instagram\.com/i.test(link) ? link : null,
        householdId: identity.membership.householdId,
        createdById: identity.user.id,
        visibility: "household",
      },
    });
    recipeId = recipe.id;
    isNewRecipe = true;
  }

  const log = await prisma.cookLog.create({
    data: {
      recipeId,
      cookedAt,
      countsAsCooked,
      rating,
      notes,
      context,
      venue,
      tags,
      cookedById: identity.user.id,
      ...(rating
        ? { ratings: { create: { userId: identity.user.id, rating } } }
        : {}),
    },
  });

  if (image) {
      const blob = await put(
        `recipes/${recipeId}/logs/${Date.now()}-${randomUUID()}.${image.extension}`,
        image.buffer,
        { access: "private", token: token ?? undefined, contentType: image.mimeType }
      );
      await prisma.photo.create({
        data: {
          url: blob.url,
          cookLogId: log.id,
          ...(isNewRecipe ? { recipeId } : {}),
        },
      });
  }

  return NextResponse.json({ recipeId, logId: log.id }, { status: 201 });
}
