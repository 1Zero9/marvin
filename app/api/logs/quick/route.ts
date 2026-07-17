import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";

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
  const body = await req.json();

  const recipeIdInput = typeof body?.recipeId === "string" ? body.recipeId : null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const rating =
    typeof body?.rating === "number" && body.rating >= 1 && body.rating <= 5
      ? Math.round(body.rating)
      : null;
  const notes =
    typeof body?.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
  const cookedAt = body?.cookedAt ? new Date(body.cookedAt) : new Date();
  if (Number.isNaN(cookedAt.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const ingredients: string[] = Array.isArray(body?.ingredients)
    ? body.ingredients
        .filter((i: unknown): i is string => typeof i === "string")
        .map((i: string) => i.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 10)
    : [];

  let recipeId: string;
  let isNewRecipe = false;
  if (recipeIdInput) {
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeIdInput, householdId: identity.membership.householdId },
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
        tags: [],
        keywords: keywordsFrom(title, ingredients),
        links: [],
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
      rating,
      notes,
      cookedById: identity.user.id,
      ...(rating
        ? { ratings: { create: { userId: identity.user.id, rating } } }
        : {}),
    },
  });

  const photo = body?.photo;
  if (
    typeof photo?.data === "string" &&
    typeof photo?.mimeType === "string" &&
    photo.mimeType.startsWith("image/")
  ) {
    const buffer = Buffer.from(photo.data, "base64");
    if (buffer.length <= 5 * 1024 * 1024) {
      const ext = photo.mimeType.split("/")[1] === "png" ? "png" : "jpg";
      const blob = await put(
        `recipes/${recipeId}/logs/${Date.now()}.${ext}`,
        buffer,
        { access: "public", contentType: photo.mimeType }
      );
      await prisma.photo.create({
        data: {
          url: blob.url,
          cookLogId: log.id,
          ...(isNewRecipe ? { recipeId } : {}),
        },
      });
    }
  }

  return NextResponse.json({ recipeId, logId: log.id }, { status: 201 });
}
