import { NextResponse } from "next/server";
import { createSession, hashPassword, hashPasswordResetToken, sessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!token || password.length < 10) return NextResponse.json({ error: "Choose a new password of at least 10 characters." }, { status: 400 });

  const reset = await prisma.passwordResetToken.findFirst({
    where: { tokenHash: hashPasswordResetToken(token), usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!reset) return NextResponse.json({ error: "This reset link is invalid, expired, or has already been used." }, { status: 401 });

  const completed = await prisma.$transaction(async (tx) => {
    const used = await tx.passwordResetToken.updateMany({ where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (used.count !== 1) return false;
    await tx.session.deleteMany({ where: { userId: reset.userId } });
    await tx.accountRecoveryCode.deleteMany({ where: { userId: reset.userId } });
    await tx.user.update({ where: { id: reset.userId }, data: { passwordHash: hashPassword(password) } });
    return true;
  });
  if (!completed) return NextResponse.json({ error: "This reset link has already been used." }, { status: 401 });

  const session = await createSession(reset.userId);
  const response = NextResponse.json({ ok: true });
  const cookie = sessionCookie(session.token, session.expiresAt);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
