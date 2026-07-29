import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { decodeImage } from "@/lib/images";

export const maxDuration = 30;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const image = decodeImage(body?.data, body?.mimeType);
  if (!image) {
    return NextResponse.json({ error: "Image required" }, { status: 400 });
  }

  const recipe = await prisma.recipe.findFirst({ where: { id, householdId: identity.membership.householdId } });
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const blob = await put(`recipes/${id}/${Date.now()}.${image.extension}`, image.buffer, {
    access: "public",
    contentType: image.mimeType,
  });

  const photo = await prisma.photo.create({
    data: { url: blob.url, recipeId: id },
  });
  return NextResponse.json(photo, { status: 201 });
}
