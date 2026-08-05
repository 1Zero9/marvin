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
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const householdName = typeof body?.householdName === "string" ? body.householdName.trim() : "";
  const rateLimit = await enforceRequestRateLimit({ request: req, namespace: "auth:setup", subject: email || undefined, clientLimit: 5, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  if (!isValidEmail(email) || !isBoundedText(displayName, REQUEST_LIMITS.displayName) || !isValidPassword(password) || (householdName.length > REQUEST_LIMITS.householdName)) {
    return NextResponse.json({ error: "Enter a name, valid email, and a password of at least 10 characters." }, { status: 400 });
  }
  const passwordHash = await hashPassword(password);
  const user = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('marvin-initial-setup'))`;
    if (await tx.user.count()) return null;
    const legacy = await tx.household.findUnique({ where: { id: "marvin-legacy-household" } });
    const household = legacy ?? await tx.household.create({ data: { name: householdName || "My Kitchen" } });
    if (legacy && householdName) await tx.household.update({ where: { id: legacy.id }, data: { name: householdName } });
    const created = await tx.user.create({ data: { email, displayName, passwordHash } });
    await tx.membership.create({ data: { userId: created.id, householdId: household.id, role: "owner" } });
    return created;
  });
  if (!user) return NextResponse.json({ error: "Marvin is already set up. Please sign in." }, { status: 403 });
  const session = await createSession(user.id);
  const response = NextResponse.json({ ok: true, user: { displayName: user.displayName } }, { status: 201 });
  const cookie = sessionCookie(session.token, session.expiresAt);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
