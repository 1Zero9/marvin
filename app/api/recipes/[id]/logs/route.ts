import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { decodeImage } from "@/lib/images";
import { privateMediaToken } from "@/lib/media";
import { visibleTo } from "@/lib/privacy";

export const maxDuration = 60;

type PhotoInput = { data: string; mimeType: string };

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const recipe = await prisma.recipe.findFirst({ where: { id, householdId: identity.membership.householdId, ...visibleTo(identity) } });
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const cookedAt = body?.cookedAt ? new Date(body.cookedAt) : new Date();
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
  const photos: PhotoInput[] = Array.isArray(body?.photos)
    ? body.photos.slice(0, 6)
    : [];
  const token = photos.length ? privateMediaToken() : null;
  if (photos.length && !token) return NextResponse.json({ error: "Private media is not configured" }, { status: 503 });

  const log = await prisma.cookLog.create({
    data: { recipeId: id, cookedAt, rating, notes, cookedById: identity.user.id,
      ...(rating ? { ratings: { create: { userId: identity.user.id, rating } } } : {}) },
  });

  for (const p of photos) {
    const image = decodeImage(p?.data, p?.mimeType);
    if (!image) continue;
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
