import { NextResponse } from "next/server";
import { createSession, hashPassword, sessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enforceRequestRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { InvalidRequestBodyError, isBoundedText, isValidEmail, isValidPassword, objectBody, readJsonBody, REQUEST_LIMITS } from "@/lib/requestSecurity";

export async function POST(req: Request) {
  let body: Record<string, unknown> | null;
  try {
    body = objectBody(await readJsonBody(req, REQUEST_LIMITS.authJsonBytes));
  } catch (error) {
    if (error instanceof InvalidRequestBodyError) return NextResponse.json({ error: "Enter a name, valid email, and a password of at least 10 characters." }, { status: 400 });
    throw error;
  }
  const token = typeof body?.token === "string" ? body.token : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const rateLimit = await enforceRequestRateLimit({ request: req, namespace: "invite:accept", subject: token || email || undefined, clientLimit: 20, subjectLimit: 10, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  if (!token || token.length > REQUEST_LIMITS.token || !isValidEmail(email) || !isBoundedText(displayName, REQUEST_LIMITS.displayName) || !isValidPassword(password)) {
    return NextResponse.json({ error: "Enter a name, valid email, and a password of at least 10 characters." }, { status: 400 });
  }
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt || invite.expiresAt <= new Date()) return NextResponse.json({ error: "This invitation has expired or was already used." }, { status: 404 });
  if (invite.email && invite.email !== email) return NextResponse.json({ error: "This invitation was made for a different email address." }, { status: 403 });
  if (await prisma.user.findUnique({ where: { email } })) return NextResponse.json({ error: "This email already has a Marvin account. Sign in, then ask the household owner to invite that account." }, { status: 409 });
  const passwordHash = await hashPassword(password);
  const user = await prisma.$transaction(async (tx) => {
    const claimed = await tx.invite.updateMany({ where: { id: invite.id, acceptedAt: null, expiresAt: { gt: new Date() } }, data: { acceptedAt: new Date() } });
    if (claimed.count !== 1) return null;
    const created = await tx.user.create({ data: { email, displayName, passwordHash } });
    await tx.membership.create({ data: { userId: created.id, householdId: invite.householdId } });
    return created;
  });
  if (!user) return NextResponse.json({ error: "This invitation has expired or was already used." }, { status: 404 });
  const session = await createSession(user.id);
  const response = NextResponse.json({ ok: true });
  const cookie = sessionCookie(session.token, session.expiresAt);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
