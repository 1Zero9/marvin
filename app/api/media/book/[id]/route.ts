import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { isPrivateBlobUrl, privateMediaToken } from "@/lib/media";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const book = await prisma.book.findFirst({
    where: { id, householdId: identity.membership.householdId },
    select: { coverUrl: true, visibility: true, createdById: true },
  });
  if (!book || !book.coverUrl || !isPrivateBlobUrl(book.coverUrl)) return new NextResponse("Not found", { status: 404 });
  const allowed = identity.membership.role === "owner" || book.visibility === "household" || book.visibility === "public" || book.createdById === identity.user.id;
  if (!allowed) return new NextResponse("Not found", { status: 404 });

  const token = privateMediaToken();
  if (!token) return NextResponse.json({ error: "Private media is not configured" }, { status: 503 });
  const result = await get(book.coverUrl, { access: "private", token, ifNoneMatch: req.headers.get("if-none-match") ?? undefined });
  if (!result) return new NextResponse("Not found", { status: 404 });
  if (result.statusCode === 304) return new NextResponse(null, { status: 304, headers: { ETag: result.blob.etag, "Cache-Control": "private, no-cache" } });
  return new NextResponse(result.stream, {
    headers: { "Content-Type": result.blob.contentType, ETag: result.blob.etag, "Cache-Control": "private, no-cache", "X-Content-Type-Options": "nosniff" },
  });
}
