import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { addDays, startOfDay } from "@/lib/dates";

export async function POST(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json();

  const type = body?.type === "zero" || body?.type === "moderate" ? body.type : null;
  if (!type) return NextResponse.json({ error: "Invalid phase type" }, { status: 400 });

  const startDate = startOfDay(body?.startDate ? new Date(body.startDate) : new Date());
  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const weeklyUnitTarget = type === "moderate"
    ? Math.max(0, Math.min(100, Math.round(Number(body?.weeklyUnitTarget) || 11)))
    : null;

  const userId = identity.user.id;

  const [, created] = await prisma.$transaction([
    prisma.alcoholPhase.updateMany({
      where: { userId, active: true },
      data: { active: false },
    }),
    prisma.alcoholPhase.create({
      data: {
        userId,
        type,
        startDate,
        endDate: type === "zero" ? addDays(startDate, 29) : null,
        weeklyUnitTarget,
        active: true,
      },
    }),
  ]);

  await prisma.alcoholPhase.updateMany({
    where: { userId, active: false, endDate: null, id: { not: created.id } },
    data: { endDate: addDays(startDate, -1) },
  });

  return NextResponse.json(created, { status: 201 });
}
