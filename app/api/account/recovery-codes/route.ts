import { NextResponse } from "next/server";
import { createRecoveryCode, currentMembership, hashRecoveryCode } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const code = createRecoveryCode();
  await prisma.$transaction([
    prisma.accountRecoveryCode.deleteMany({ where: { userId: identity.user.id } }),
    prisma.accountRecoveryCode.create({ data: { userId: identity.user.id, codeHash: hashRecoveryCode(code) } }),
  ]);
  return NextResponse.json({ code });
}
