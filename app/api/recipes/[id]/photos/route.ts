import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";

export const maxDuration = 30;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const data: string | undefined = body?.data;
  const mimeType: string | undefined = body?.mimeType;

  if (!data || !mimeType?.startsWith("image/")) {
    return NextResponse.json({ error: "Image required" }, { status: 400 });
  }
  const buffer = Buffer.from(data, "base64");
  if (buffer.length > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large" }, { status: 400 });
  }

  const recipe = await prisma.recipe.findFirst({ where: { id, householdId: identity.membership.householdId } });
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const ext = mimeType.split("/")[1] === "png" ? "png" : "jpg";
  const blob = await put(`recipes/${id}/${Date.now()}.${ext}`, buffer, {
    access: "public",
    contentType: mimeType,
  });

  const photo = await prisma.photo.create({
    data: { url: blob.url, recipeId: id },
  });
  return NextResponse.json(photo, { status: 201 });
}
