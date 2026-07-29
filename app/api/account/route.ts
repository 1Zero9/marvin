import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { currentMembership, verifyPassword } from "@/lib/auth";
import { isPrivateBlobUrl, privateMediaToken } from "@/lib/media";
import { prisma } from "@/lib/prisma";

function ownedBlobUrl(url: string | null) {
  return Boolean(url && url.includes(".blob.vercel-storage.com/"));
}

export async function DELETE(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json();
  if (body?.confirmation !== "DELETE MY ACCOUNT" || typeof body?.password !== "string" || !verifyPassword(body.password, identity.user.passwordHash)) {
    return NextResponse.json({ error: "Enter your current password and DELETE MY ACCOUNT exactly to continue." }, { status: 400 });
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: identity.user.id },
    select: { householdId: true, household: { select: { _count: { select: { memberships: true } } } } },
  });
  const soleHouseholdIds = memberships
    .filter((membership) => membership.household._count.memberships === 1)
    .map((membership) => membership.householdId);

  // The external objects must go first. A failed storage deletion leaves the
  // database untouched, so the person can retry instead of leaving orphaned data.
  if (soleHouseholdIds.length) {
    const [books, photos] = await Promise.all([
      prisma.book.findMany({ where: { householdId: { in: soleHouseholdIds } }, select: { coverUrl: true } }),
      prisma.photo.findMany({
        where: { OR: [{ recipe: { householdId: { in: soleHouseholdIds } } }, { cookLog: { recipe: { householdId: { in: soleHouseholdIds } } } }] },
        select: { url: true },
      }),
    ]);
    const privateToken = privateMediaToken();
    const urls = [...books.map((book) => book.coverUrl), ...photos.map((photo) => photo.url)].filter(ownedBlobUrl) as string[];
    try {
      await Promise.all(urls.map((url) => del(url, isPrivateBlobUrl(url) ? { token: privateToken ?? undefined } : undefined)));
    } catch {
      return NextResponse.json({ error: "We could not remove all stored media. Nothing has been deleted; please try again." }, { status: 503 });
    }
  }

  await prisma.$transaction(async (tx) => {
    if (soleHouseholdIds.length) {
      const photoIds = await tx.photo.findMany({
        where: { OR: [{ recipe: { householdId: { in: soleHouseholdIds } } }, { cookLog: { recipe: { householdId: { in: soleHouseholdIds } } } }] },
        select: { id: true },
      });
      await tx.photo.deleteMany({ where: { id: { in: photoIds.map((photo) => photo.id) } } });
      await tx.household.deleteMany({ where: { id: { in: soleHouseholdIds } } });
    }
    await tx.user.delete({ where: { id: identity.user.id } });
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set("marvin_session", "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
