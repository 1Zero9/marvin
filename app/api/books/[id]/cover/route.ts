import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const ext = mimeType.split("/")[1] === "png" ? "png" : "jpg";
  const blob = await put(`covers/${id}.${ext}`, buffer, {
    access: "public",
    contentType: mimeType,
    allowOverwrite: true,
  });

  const updated = await prisma.book.update({
    where: { id },
    data: { coverUrl: blob.url },
  });
  return NextResponse.json({ coverUrl: updated.coverUrl });
}
