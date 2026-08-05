import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { fromDateInput, startOfDay } from "@/lib/dates";
import { API_LIMITS, optionalBoundedText } from "@/lib/apiLimits";
import { readJsonObject } from "@/lib/requestSecurity";

const STUCK_VALUES = ["yes", "partial", "no"];

export async function POST(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await readJsonObject(req, API_LIMITS.smallJsonBytes).catch(() => null);

  const stuckToPlan = typeof body?.stuckToPlan === "string" && STUCK_VALUES.includes(body.stuckToPlan) ? body.stuckToPlan : null;
  const energyMood = body?.energyMood != null ? Number(body.energyMood) : null;
  if (energyMood != null && (!Number.isInteger(energyMood) || energyMood < 1 || energyMood > 5)) {
    return NextResponse.json({ error: "Invalid energy/mood value" }, { status: 400 });
  }
  const note = optionalBoundedText(body?.note, 500);
  if (note === undefined) return NextResponse.json({ error: "Notes must be 500 characters or fewer." }, { status: 400 });
  const date = startOfDay(body?.date ? fromDateInput(body.date) : new Date());
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const userId = identity.user.id;
  const entry = await prisma.dailyRating.upsert({
    where: { userId_date: { userId, date } },
    update: { stuckToPlan, energyMood, note },
    create: { userId, date, stuckToPlan, energyMood, note },
  });
  return NextResponse.json(entry, { status: 201 });
}
