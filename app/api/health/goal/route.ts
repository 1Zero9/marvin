import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { API_LIMITS } from "@/lib/apiLimits";
import { readJsonObject } from "@/lib/requestSecurity";

export async function PUT(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await readJsonObject(req, API_LIMITS.smallJsonBytes).catch(() => null);

  const targetWeightKg = typeof body?.targetWeightKg === "number" ? body.targetWeightKg : Number(body?.targetWeightKg);
  const heightCm = typeof body?.heightCm === "number" ? body.heightCm : Number(body?.heightCm);
  if (!Number.isFinite(targetWeightKg) || targetWeightKg <= 0 || targetWeightKg > 400) {
    return NextResponse.json({ error: "Enter a valid target weight" }, { status: 400 });
  }
  if (!Number.isFinite(heightCm) || heightCm <= 0 || heightCm > 260) {
    return NextResponse.json({ error: "Enter a valid height" }, { status: 400 });
  }

  const goal = await prisma.userGoal.upsert({
    where: { userId: identity.user.id },
    update: { targetWeightKg, heightCm },
    create: { userId: identity.user.id, targetWeightKg, heightCm },
  });
  return NextResponse.json(goal);
}
