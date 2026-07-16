import { NextResponse } from "next/server";
import { createSession, hashPassword, sessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const token = typeof body?.token === "string" ? body.token : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!token || !/^\S+@\S+\.\S+$/.test(email) || !displayName || password.length < 10) {
    return NextResponse.json({ error: "Enter a name, valid email, and a password of at least 10 characters." }, { status: 400 });
  }
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt || invite.expiresAt <= new Date()) return NextResponse.json({ error: "This invitation has expired or was already used." }, { status: 404 });
  if (invite.email && invite.email !== email) return NextResponse.json({ error: "This invitation was made for a different email address." }, { status: 403 });
  if (await prisma.user.findUnique({ where: { email } })) return NextResponse.json({ error: "This email already has a Marvin account. Sign in, then ask the household owner to invite that account." }, { status: 409 });
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { email, displayName, passwordHash: hashPassword(password) } });
    await tx.membership.create({ data: { userId: created.id, householdId: invite.householdId } });
    await tx.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
    return created;
  });
  const session = await createSession(user.id);
  const response = NextResponse.json({ ok: true });
  const cookie = sessionCookie(session.token, session.expiresAt);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
