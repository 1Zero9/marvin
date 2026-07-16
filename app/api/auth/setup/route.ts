import { NextResponse } from "next/server";
import { createSession, hashPassword, sessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const householdName = typeof body?.householdName === "string" ? body.householdName.trim() : "";
  if (!/^\S+@\S+\.\S+$/.test(email) || !displayName || password.length < 10) {
    return NextResponse.json({ error: "Enter a name, valid email, and a password of at least 10 characters." }, { status: 400 });
  }
  if (await prisma.user.count()) {
    return NextResponse.json({ error: "Marvin is already set up. Please sign in." }, { status: 403 });
  }
  const user = await prisma.$transaction(async (tx) => {
    const legacy = await tx.household.findUnique({ where: { id: "marvin-legacy-household" } });
    const household = legacy ?? await tx.household.create({ data: { name: householdName || "My Kitchen" } });
    if (legacy && householdName) await tx.household.update({ where: { id: legacy.id }, data: { name: householdName } });
    const created = await tx.user.create({ data: { email, displayName, passwordHash: hashPassword(password) } });
    await tx.membership.create({ data: { userId: created.id, householdId: household.id, role: "owner" } });
    return created;
  });
  const session = await createSession(user.id);
  const response = NextResponse.json({ ok: true, user: { displayName: user.displayName } }, { status: 201 });
  const cookie = sessionCookie(session.token, session.expiresAt);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
