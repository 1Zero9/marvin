import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { decodeImage } from "@/lib/images";
import { privateMediaToken } from "@/lib/media";
import { visibleTo } from "@/lib/privacy";
import { readJsonObject } from "@/lib/requestSecurity";
import { enforceMediaUploadRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const maxDuration = 60;

type PhotoInput = { data: string; mimeType: string };

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const body = await readJsonObject(req, 43 * 1024 * 1024).catch(() => null);
  if (!body) return NextResponse.json({ error: "Meal log is missing or too large." }, { status: 413 });

  const recipe = await prisma.recipe.findFirst({ where: { id, householdId: identity.membership.householdId, archived: false, ...visibleTo(identity) } });
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const cookedAtValue = typeof body?.cookedAt === "string" || typeof body?.cookedAt === "number" ? body.cookedAt : null;
  const cookedAt = cookedAtValue !== null ? new Date(cookedAtValue) : new Date();
  if (Number.isNaN(cookedAt.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const rating =
    typeof body?.rating === "number" && body.rating >= 1 && body.rating <= 5
      ? Math.round(body.rating)
      : null;
  const notes =
    typeof body?.notes === "string" && body.notes.trim()
      ? body.notes.trim()
      : null;
  if (notes && notes.length > 2_000) return NextResponse.json({ error: "Meal notes must be 2,000 characters or fewer." }, { status: 400 });
  if (body?.photos !== undefined && (!Array.isArray(body.photos) || body.photos.length > 6)) return NextResponse.json({ error: "Add no more than 6 photos." }, { status: 400 });
  const photos: PhotoInput[] = Array.isArray(body?.photos) ? body.photos as PhotoInput[] : [];
  if (photos.some((photo) => !decodeImage(photo?.data, photo?.mimeType))) return NextResponse.json({ error: "Photos must be valid JPEG, PNG, or WebP files under 5 MB." }, { status: 400 });
  const token = photos.length ? privateMediaToken() : null;
  if (photos.length && !token) return NextResponse.json({ error: "Private media is not configured" }, { status: 503 });
  if (photos.length) {
    const rateLimit = await enforceMediaUploadRateLimit(identity.user.id, photos.length);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  }

  const log = await prisma.cookLog.create({
    data: { recipeId: id, cookedAt, rating, notes, cookedById: identity.user.id,
      ...(rating ? { ratings: { create: { userId: identity.user.id, rating } } } : {}) },
  });

  for (const p of photos) {
    const image = decodeImage(p?.data, p?.mimeType)!;
    const blob = await put(`recipes/${id}/logs/${Date.now()}-${randomUUID()}.${image.extension}`, image.buffer, {
      access: "private",
      token: token ?? undefined,
      contentType: image.mimeType,
    });
    await prisma.photo.create({
      data: { url: blob.url, cookLogId: log.id },
    });
  }

  return NextResponse.json(log, { status: 201 });
}
