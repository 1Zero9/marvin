import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { startOfDay } from "@/lib/dates";

export async function POST(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json();

  const hadDrink = Boolean(body?.hadDrink);
  const date = startOfDay(body?.date ? new Date(body.date) : new Date());
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const units = hadDrink && typeof body?.units === "number" && Number.isFinite(body.units) && body.units >= 0
    ? Math.round(body.units * 10) / 10
    : null;
  const notes = typeof body?.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 500) : null;

  const log = await prisma.alcoholLog.upsert({
    where: { userId_date: { userId: identity.user.id, date } },
    update: { hadDrink, units, notes },
    create: { userId: identity.user.id, date, hadDrink, units, notes },
  });
  return NextResponse.json(log, { status: 201 });
}
