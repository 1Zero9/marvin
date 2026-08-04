import { NextResponse } from "next/server";
import { createPasswordResetToken, hashPasswordResetToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const GENERIC = {
  ok: true,
  message: "If that email is registered with Marvin, we've sent a link to reset the password.",
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email delivery isn't set up yet. Ask the household owner to send you a reset link from the admin page instead." },
      { status: 503 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = createPasswordResetToken();
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hashPasswordResetToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      }),
    ]);
    const url = new URL(`/reset#token=${token}`, req.url).toString();
    try {
      await sendPasswordResetEmail({ to: user.email, displayName: user.displayName, url });
    } catch (error) {
      console.error("Failed to send password reset email", error);
    }
  }

  return NextResponse.json(GENERIC);
}
