import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { API_LIMITS } from "@/lib/apiLimits";
import { readJsonObject } from "@/lib/requestSecurity";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const phase = await prisma.alcoholPhase.findFirst({ where: { id, userId: identity.user.id } });
  if (!phase) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (phase.type !== "moderate") {
    return NextResponse.json({ error: "Only moderate phases have an editable target" }, { status: 400 });
  }
  const body = await readJsonObject(req, API_LIMITS.smallJsonBytes).catch(() => null);
  const weeklyUnitTarget = Math.max(0, Math.min(100, Math.round(Number(body?.weeklyUnitTarget))));
  if (!Number.isFinite(weeklyUnitTarget)) {
    return NextResponse.json({ error: "Enter a valid weekly target" }, { status: 400 });
  }
  const updated = await prisma.alcoholPhase.update({ where: { id }, data: { weeklyUnitTarget } });
  return NextResponse.json(updated);
}
