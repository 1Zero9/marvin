import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { fromDateInput, startOfDay } from "@/lib/dates";
import { API_LIMITS, optionalBoundedText } from "@/lib/apiLimits";
import { readJsonObject } from "@/lib/requestSecurity";

export async function POST(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await readJsonObject(req, API_LIMITS.smallJsonBytes).catch(() => null);

  const weightKg = typeof body?.weightKg === "number" ? body.weightKg : Number(body?.weightKg);
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 400) {
    return NextResponse.json({ error: "Enter a valid weight" }, { status: 400 });
  }
  const date = startOfDay(body?.date ? fromDateInput(body.date) : new Date());
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const notes = optionalBoundedText(body?.notes, 500);
  if (notes === undefined) return NextResponse.json({ error: "Notes must be 500 characters or fewer." }, { status: 400 });

  const entry = await prisma.weightLog.create({
    data: { userId: identity.user.id, date, weightKg: Math.round(weightKg * 10) / 10, notes },
  });
  return NextResponse.json(entry, { status: 201 });
}
