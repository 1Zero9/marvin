import { NextResponse } from "next/server";
import { createPasswordResetToken, currentMembership, hashPasswordResetToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publicAppUrl } from "@/lib/requestSecurity";
import { logServerError, requestIdFrom } from "@/lib/serverLog";
import { enforceRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function POST(req: Request, { params }: { params: Promise<{ membershipId: string }> }) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (identity.membership.role !== "owner") return NextResponse.json({ error: "Only the household owner can send reset links." }, { status: 403 });

  const { membershipId } = await params;
  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, householdId: identity.membership.householdId },
    include: { user: { select: { id: true, displayName: true } } },
  });
  if (!membership) return NextResponse.json({ error: "That person is not in your kitchen." }, { status: 404 });
  const rateLimit = await enforceRateLimit({ namespace: "admin:reset-link", identifier: identity.user.id, limit: 20, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  let url: string;
  try {
    url = publicAppUrl("/reset", req.url);
  } catch (error) {
    logServerError("admin_reset.public_url_failed", error, { requestId: requestIdFrom(req) });
    return NextResponse.json({ error: "Reset links are temporarily unavailable." }, { status: 503 });
  }

  const token = createPasswordResetToken();
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: membership.userId, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: { userId: membership.userId, tokenHash: hashPasswordResetToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    }),
  ]);

  url = `${url}#token=${token}`;
  return NextResponse.json({ url, displayName: membership.user.displayName });
}
