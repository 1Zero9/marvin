import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InvalidRequestBodyError, isValidEmail, objectBody, publicAppUrl, readJsonBody, REQUEST_LIMITS } from "@/lib/requestSecurity";
import { logServerError, requestIdFrom } from "@/lib/serverLog";
import { enforceRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (identity.membership.role !== "owner") return NextResponse.json({ error: "Only the household owner can invite people." }, { status: 403 });
  let body: Record<string, unknown> | null;
  try {
    body = objectBody(await readJsonBody(req, REQUEST_LIMITS.authJsonBytes));
  } catch (error) {
    if (error instanceof InvalidRequestBodyError) return NextResponse.json({ error: "Enter a valid email, or leave it blank for a shareable link." }, { status: 400 });
    throw error;
  }
  const email = typeof body?.email === "string" && body.email.trim()
    ? body.email.trim().toLowerCase()
    : null;
  if (email && !isValidEmail(email)) return NextResponse.json({ error: "Enter a valid email, or leave it blank for a shareable link." }, { status: 400 });
  if (typeof body?.email === "string" && body.email.length > REQUEST_LIMITS.email) return NextResponse.json({ error: "Enter a valid email, or leave it blank for a shareable link." }, { status: 400 });
  const rateLimit = await enforceRateLimit({ namespace: "invite:create", identifier: identity.user.id, limit: 20, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  const token = randomBytes(24).toString("base64url");
  let inviteUrl: string;
  try {
    inviteUrl = publicAppUrl(`/join/${token}`, req.url);
  } catch (error) {
    logServerError("invite.public_url_failed", error, { requestId: requestIdFrom(req) });
    return NextResponse.json({ error: "Invitation links are temporarily unavailable." }, { status: 503 });
  }
  const invite = await prisma.invite.create({
    data: {
      householdId: identity.membership.householdId,
      invitedById: identity.user.id,
      email,
      token,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });
  return NextResponse.json({ invite: { token: invite.token, expiresAt: invite.expiresAt, url: inviteUrl } }, { status: 201 });
}
