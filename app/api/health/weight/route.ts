import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";

export async function POST(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json();

  const weightKg = typeof body?.weightKg === "number" ? body.weightKg : Number(body?.weightKg);
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 400) {
    return NextResponse.json({ error: "Enter a valid weight" }, { status: 400 });
  }
  const date = body?.date ? new Date(body.date) : new Date();
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const notes = typeof body?.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 500) : null;

  const entry = await prisma.weightLog.create({
    data: { userId: identity.user.id, date, weightKg: Math.round(weightKg * 10) / 10, notes },
  });
  return NextResponse.json(entry, { status: 201 });
}
