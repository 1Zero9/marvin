import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { isPrivateBlobUrl, privateMediaToken } from "@/lib/media";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function canView(identity: NonNullable<Awaited<ReturnType<typeof currentMembership>>>, recipe: { householdId: string; visibility: string; createdById: string | null }) {
  return recipe.householdId === identity.membership.householdId && (
    identity.membership.role === "owner" ||
    recipe.visibility === "household" ||
    recipe.visibility === "public" ||
    recipe.createdById === identity.user.id
  );
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photo = await prisma.photo.findUnique({
    where: { id },
    select: {
      url: true,
      recipe: { select: { householdId: true, visibility: true, createdById: true, shareSlug: true, shareEnabled: true } },
      cookLog: { select: { recipe: { select: { householdId: true, visibility: true, createdById: true } } } },
    },
  });
  if (!photo || !isPrivateBlobUrl(photo.url)) return new NextResponse("Not found", { status: 404 });

  const shareSlug = new URL(req.url).searchParams.get("share");
  const recipe = photo.recipe ?? photo.cookLog?.recipe;
  const sharedPhoto = photo.recipe && shareSlug && photo.recipe.shareEnabled && photo.recipe.shareSlug === shareSlug;
  if (!sharedPhoto) {
    const identity = await currentMembership();
    if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    if (!recipe || !canView(identity, recipe)) return new NextResponse("Not found", { status: 404 });
  }

  const token = privateMediaToken();
  if (!token) return NextResponse.json({ error: "Private media is not configured" }, { status: 503 });
  const result = await get(photo.url, { access: "private", token, ifNoneMatch: req.headers.get("if-none-match") ?? undefined });
  if (!result) return new NextResponse("Not found", { status: 404 });
  const cacheControl = sharedPhoto ? "no-store" : "private, no-cache";
  if (result.statusCode === 304) {
    return new NextResponse(null, { status: 304, headers: { ETag: result.blob.etag, "Cache-Control": cacheControl } });
  }
  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      ETag: result.blob.etag,
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
