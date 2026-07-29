import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { fromDateInput, startOfDay } from "@/lib/dates";

export async function POST(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json();

  const exerciseIds = Array.isArray(body?.exerciseIds) ? body.exerciseIds.filter((id: unknown) => typeof id === "string") : [];
  if (exerciseIds.length === 0) {
    return NextResponse.json({ error: "Pick at least one exercise" }, { status: 400 });
  }
  const durationMin = Number(body?.durationMin);
  if (!Number.isFinite(durationMin) || durationMin <= 0 || durationMin > 180) {
    return NextResponse.json({ error: "Enter a valid duration" }, { status: 400 });
  }
  const date = startOfDay(body?.date ? fromDateInput(body.date) : new Date());
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const notes = typeof body?.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 500) : null;

  const session = await prisma.workoutSession.create({
    data: { userId: identity.user.id, date, durationMin: Math.round(durationMin), exerciseIds, notes },
  });
  return NextResponse.json(session, { status: 201 });
}
