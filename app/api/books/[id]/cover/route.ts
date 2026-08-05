import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { del, put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { canManage } from "@/lib/privacy";
import { decodeImage } from "@/lib/images";
import { isPrivateBlobUrl, privateMediaToken } from "@/lib/media";
import { readJsonObject } from "@/lib/requestSecurity";
import { enforceMediaUploadRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const maxDuration = 30;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const body = await readJsonObject(req, 8 * 1024 * 1024).catch(() => null);
  const image = decodeImage(body?.data, body?.mimeType);
  if (!image) {
    return NextResponse.json({ error: "Image required" }, { status: 400 });
  }

  const book = await prisma.book.findFirst({ where: { id, householdId: identity.membership.householdId } });
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
  if (!canManage(identity, book.createdById)) return NextResponse.json({ error: "Only the owner or creator can change this private book." }, { status: 403 });
  const rateLimit = await enforceMediaUploadRateLimit(identity.user.id);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const token = privateMediaToken();
  if (!token) return NextResponse.json({ error: "Private media is not configured" }, { status: 503 });
  const blob = await put(`covers/${id}-${Date.now()}-${randomUUID()}.${image.extension}`, image.buffer, {
    access: "private",
    token,
    contentType: image.mimeType,
  });

  if (book.coverUrl?.includes(".blob.vercel-storage.com/")) {
    try {
      await del(book.coverUrl, isPrivateBlobUrl(book.coverUrl) ? { token } : undefined);
    } catch {}
  }

  const updated = await prisma.book.update({
    where: { id },
    data: { coverUrl: blob.url },
  });
  return NextResponse.json({ coverUrl: updated.coverUrl });
}
