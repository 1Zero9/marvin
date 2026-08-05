import { NextResponse } from "next/server";
import { createSession, hashPassword, hashPasswordResetToken, sessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enforceRequestRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { InvalidRequestBodyError, isValidPassword, objectBody, readJsonBody, REQUEST_LIMITS } from "@/lib/requestSecurity";

export async function POST(req: Request) {
  let body: Record<string, unknown> | null;
  try {
    body = objectBody(await readJsonBody(req, REQUEST_LIMITS.authJsonBytes));
  } catch (error) {
    if (error instanceof InvalidRequestBodyError) return NextResponse.json({ error: "Choose a new password of at least 10 characters." }, { status: 400 });
    throw error;
  }
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const rateLimit = await enforceRequestRateLimit({ request: req, namespace: "auth:reset", subject: token || undefined, clientLimit: 20, subjectLimit: 10, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  if (!token || token.length > REQUEST_LIMITS.token || !isValidPassword(password)) return NextResponse.json({ error: "Choose a new password of at least 10 characters." }, { status: 400 });

  const reset = await prisma.passwordResetToken.findFirst({
    where: { tokenHash: hashPasswordResetToken(token), usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!reset) return NextResponse.json({ error: "This reset link is invalid, expired, or has already been used." }, { status: 401 });

  const passwordHash = await hashPassword(password);
  const completed = await prisma.$transaction(async (tx) => {
    const used = await tx.passwordResetToken.updateMany({ where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (used.count !== 1) return false;
    await tx.session.deleteMany({ where: { userId: reset.userId } });
    await tx.accountRecoveryCode.deleteMany({ where: { userId: reset.userId } });
    await tx.user.update({ where: { id: reset.userId }, data: { passwordHash } });
    return true;
  });
  if (!completed) return NextResponse.json({ error: "This reset link has already been used." }, { status: 401 });

  const session = await createSession(reset.userId);
  const response = NextResponse.json({ ok: true });
  const cookie = sessionCookie(session.token, session.expiresAt);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
