import { NextResponse } from "next/server";
import { createSession, sessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enforceRequestRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { InvalidRequestBodyError, isValidEmail, objectBody, readJsonBody, REQUEST_LIMITS } from "@/lib/requestSecurity";

const DUMMY_PASSWORD_HASH = `${"0".repeat(32)}:${"0".repeat(128)}`;

export async function POST(req: Request) {
  let body: Record<string, unknown> | null;
  try {
    body = objectBody(await readJsonBody(req, REQUEST_LIMITS.authJsonBytes));
  } catch (error) {
    if (error instanceof InvalidRequestBodyError) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
    throw error;
  }
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const rateLimit = await enforceRequestRateLimit({ request: req, namespace: "auth:signin", subject: email || undefined, clientLimit: 20, subjectLimit: 10, windowMs: 15 * 60 * 1000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  if (!isValidEmail(email) || password.length === 0 || password.length > REQUEST_LIMITS.password) {
    return NextResponse.json({ error: "Email or password is not right." }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  const passwordMatches = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !passwordMatches) {
    return NextResponse.json({ error: "Email or password is not right." }, { status: 401 });
  }
  const session = await createSession(user.id);
  const response = NextResponse.json({ ok: true, user: { displayName: user.displayName } });
  const cookie = sessionCookie(session.token, session.expiresAt);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
