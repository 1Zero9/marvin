import { NextResponse } from "next/server";
import { del, put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { canManage } from "@/lib/privacy";

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

  const book = await prisma.book.findFirst({ where: { id, householdId: identity.membership.householdId } });
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
  if (!canManage(identity, book.createdById)) return NextResponse.json({ error: "Only the owner or creator can change this private book." }, { status: 403 });

  const ext = mimeType.split("/")[1] === "png" ? "png" : "jpg";
  const blob = await put(`covers/${id}-${Date.now()}.${ext}`, buffer, {
    access: "public",
    contentType: mimeType,
  });

  if (book.coverUrl?.includes(".blob.vercel-storage.com/")) {
    try {
      await del(book.coverUrl);
    } catch {}
  }

  const updated = await prisma.book.update({
    where: { id },
    data: { coverUrl: blob.url },
  });
  return NextResponse.json({ coverUrl: updated.coverUrl });
}
