import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export { hashPassword, verifyPassword } from "@/lib/password";

export const SESSION_COOKIE = "marvin_session";
const SESSION_DAYS = 30;

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createPasswordResetToken() {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(`marvin-password-reset:${token}`).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId, expiresAt: { lte: new Date() } } });
    await tx.session.create({ data: { token: hashSessionToken(token), userId, expiresAt } });
    const superseded = await tx.session.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: 10,
      select: { id: true },
    });
    if (superseded.length) {
      await tx.session.deleteMany({ where: { id: { in: superseded.map(({ id }) => id) } } });
    }
  });
  return { token, expiresAt };
}

export async function currentMembership() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token: hashSessionToken(token) },
    include: { user: { include: { memberships: { include: { household: true }, orderBy: { createdAt: "asc" } } } } },
  });
  if (!session || session.expiresAt <= new Date()) {
    if (session) await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  const membership = session.user.memberships[0];
  return membership ? { user: session.user, membership } : null;
}

export function hashedSessionToken(token: string) {
  return hashSessionToken(token);
}

export async function requireHousehold() {
  const identity = await currentMembership();
  if (!identity) redirect("/signin");
  return identity;
}

export function sessionCookie(token: string, expiresAt: Date) {
  return {
    name: SESSION_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      priority: "high" as const,
      path: "/",
      expires: expiresAt,
    },
  };
}
