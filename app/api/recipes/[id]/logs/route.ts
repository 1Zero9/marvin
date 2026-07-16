import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

type PhotoInput = { data: string; mimeType: string };

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const recipe = await prisma.recipe.findUnique({ where: { id } });
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

  const log = await prisma.cookLog.create({
    data: { recipeId: id, cookedAt, rating, notes },
  });

  const photos: PhotoInput[] = Array.isArray(body?.photos)
    ? body.photos.slice(0, 6)
    : [];
  for (const p of photos) {
    if (!p?.data || !p?.mimeType?.startsWith("image/")) continue;
    const buffer = Buffer.from(p.data, "base64");
    if (buffer.length > 5 * 1024 * 1024) continue;
    const ext = p.mimeType.split("/")[1] === "png" ? "png" : "jpg";
    const blob = await put(`recipes/${id}/logs/${Date.now()}.${ext}`, buffer, {
      access: "public",
      contentType: p.mimeType,
    });
    await prisma.photo.create({
      data: { url: blob.url, cookLogId: log.id },
    });
  }

  return NextResponse.json(log, { status: 201 });
}
