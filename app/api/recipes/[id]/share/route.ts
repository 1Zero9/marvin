import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { canManage } from "@/lib/privacy";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const recipe = await prisma.recipe.findFirst({
    where: { id, householdId: identity.membership.householdId },
    select: { id: true, createdById: true },
  });
  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  if (!canManage(identity, recipe.createdById)) {
    return NextResponse.json({ error: "Only the household owner or person who added this recipe can share it." }, { status: 403 });
  }
  const rateLimit = await enforceRateLimit({ namespace: "recipe:share", identifier: identity.user.id, limit: 30, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const shareSlug = randomBytes(20).toString("base64url");
  const shared = await prisma.recipe.update({
    where: { id },
    data: { shareSlug, shareEnabled: true },
    select: { shareSlug: true },
  });
  return NextResponse.json({ url: new URL(`/share/${shared.shareSlug}`, req.url).toString() });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const recipe = await prisma.recipe.findFirst({
    where: { id, householdId: identity.membership.householdId },
    select: { id: true, createdById: true },
  });
  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  if (!canManage(identity, recipe.createdById)) {
    return NextResponse.json({ error: "Only the household owner or person who added this recipe can stop sharing it." }, { status: 403 });
  }

  await prisma.recipe.update({ where: { id }, data: { shareEnabled: false, shareSlug: null } });
  return NextResponse.json({ ok: true });
}
