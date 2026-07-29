import { NextResponse } from "next/server";
import { createSession, hashPassword, hashRecoveryCode, sessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!/^\S+@\S+\.\S+$/.test(email) || !code || password.length < 10) {
    return NextResponse.json({ error: "Enter your email, recovery code, and a new password of at least 10 characters." }, { status: 400 });
  }

  const recovery = await prisma.accountRecoveryCode.findFirst({
    where: { codeHash: hashRecoveryCode(code), usedAt: null, user: { email } },
    include: { user: true },
  });
  if (!recovery) return NextResponse.json({ error: "That email and recovery code do not match." }, { status: 401 });

  const recovered = await prisma.$transaction(async (tx) => {
    const used = await tx.accountRecoveryCode.updateMany({ where: { id: recovery.id, usedAt: null }, data: { usedAt: new Date() } });
    if (used.count !== 1) return false;
    await tx.session.deleteMany({ where: { userId: recovery.userId } });
    await tx.user.update({ where: { id: recovery.userId }, data: { passwordHash: hashPassword(password) } });
    return true;
  });
  if (!recovered) return NextResponse.json({ error: "That recovery code has already been used." }, { status: 401 });
  const session = await createSession(recovery.userId);

  const response = NextResponse.json({ ok: true });
  const cookie = sessionCookie(session.token, session.expiresAt);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
