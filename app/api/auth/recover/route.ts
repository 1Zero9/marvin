import { NextResponse } from "next/server";
import { createPasswordResetToken, hashPasswordResetToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { enforceRequestRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { InvalidRequestBodyError, isValidEmail, objectBody, publicAppUrl, readJsonBody, REQUEST_LIMITS } from "@/lib/requestSecurity";
import { logServerError, requestIdFrom } from "@/lib/serverLog";

const GENERIC = {
  ok: true,
  message: "If that email is registered with Marvin, we've sent a link to reset the password.",
};

export async function POST(req: Request) {
  let body: Record<string, unknown> | null;
  try {
    body = objectBody(await readJsonBody(req, REQUEST_LIMITS.authJsonBytes));
  } catch (error) {
    if (error instanceof InvalidRequestBodyError) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    throw error;
  }
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const rateLimit = await enforceRequestRateLimit({ request: req, namespace: "auth:recover", subject: email, clientLimit: 10, subjectLimit: 5, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email delivery isn't set up yet. Ask the household owner to send you a reset link from the admin page instead." },
      { status: 503 }
    );
  }

  let resetUrl: string;
  try {
    resetUrl = publicAppUrl("/reset", req.url);
  } catch (error) {
    logServerError("password_recovery.public_url_failed", error, { requestId: requestIdFrom(req) });
    return NextResponse.json({ error: "Password recovery is temporarily unavailable." }, { status: 503 });
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
    const url = `${resetUrl}#token=${token}`;
    try {
      await sendPasswordResetEmail({ to: user.email, displayName: user.displayName, url });
    } catch (error) {
      logServerError("password_recovery.email_failed", error, { requestId: requestIdFrom(req) });
    }
  }

  return NextResponse.json(GENERIC);
}
