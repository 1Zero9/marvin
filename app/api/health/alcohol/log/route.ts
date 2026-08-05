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

  const hadDrink = Boolean(body?.hadDrink);
  const date = startOfDay(body?.date ? fromDateInput(body.date) : new Date());
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const units = hadDrink && typeof body?.units === "number" && Number.isFinite(body.units) && body.units >= 0
    ? Math.round(body.units * 10) / 10
    : null;
  const notes = optionalBoundedText(body?.notes, 500);
  if (notes === undefined) return NextResponse.json({ error: "Notes must be 500 characters or fewer." }, { status: 400 });

  const log = await prisma.alcoholLog.upsert({
    where: { userId_date: { userId: identity.user.id, date } },
    update: { hadDrink, units, notes },
    create: { userId: identity.user.id, date, hadDrink, units, notes },
  });
  return NextResponse.json(log, { status: 201 });
}
