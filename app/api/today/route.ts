import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { fromDateInput, startOfDay } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = await req.json();
  const date = startOfDay(body?.date ? fromDateInput(body.date) : new Date());
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const data: { waterGlasses?: number; intention?: string | null; reflection?: string | null } = {};
  if (Object.hasOwn(body ?? {}, "waterGlasses")) {
    const waterGlasses = Number(body.waterGlasses);
    if (!Number.isInteger(waterGlasses) || waterGlasses < 0 || waterGlasses > 20) {
      return NextResponse.json({ error: "Water must be between 0 and 20 glasses." }, { status: 400 });
    }
    data.waterGlasses = waterGlasses;
  }
  if (Object.hasOwn(body ?? {}, "intention")) {
    data.intention = typeof body.intention === "string" && body.intention.trim()
      ? body.intention.trim().slice(0, 160)
      : null;
  }
  if (Object.hasOwn(body ?? {}, "reflection")) {
    data.reflection = typeof body.reflection === "string" && body.reflection.trim()
      ? body.reflection.trim().slice(0, 500)
      : null;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
  }

  const userId = identity.user.id;
  const entry = await prisma.dailyCompanion.upsert({
    where: { userId_date: { userId, date } },
    update: data,
    create: { userId, date, ...data },
  });
  return NextResponse.json(entry);
}
