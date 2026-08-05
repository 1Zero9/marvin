import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { fromDateInput, startOfDay } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { API_LIMITS, optionalBoundedText } from "@/lib/apiLimits";
import { readJsonObject } from "@/lib/requestSecurity";

export async function PATCH(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = await readJsonObject(req, API_LIMITS.smallJsonBytes).catch(() => null);
  const date = startOfDay(body?.date ? fromDateInput(body.date) : new Date());
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const data: { waterGlasses?: number; intention?: string | null; reflection?: string | null } = {};
  if (Object.hasOwn(body ?? {}, "waterGlasses")) {
    const waterGlasses = Number(body?.waterGlasses);
    if (!Number.isInteger(waterGlasses) || waterGlasses < 0 || waterGlasses > 20) {
      return NextResponse.json({ error: "Water must be between 0 and 20 glasses." }, { status: 400 });
    }
    data.waterGlasses = waterGlasses;
  }
  if (Object.hasOwn(body ?? {}, "intention")) {
    const intention = optionalBoundedText(body?.intention, 160);
    if (intention === undefined) return NextResponse.json({ error: "Intentions must be 160 characters or fewer." }, { status: 400 });
    data.intention = intention;
  }
  if (Object.hasOwn(body ?? {}, "reflection")) {
    const reflection = optionalBoundedText(body?.reflection, 500);
    if (reflection === undefined) return NextResponse.json({ error: "Reflections must be 500 characters or fewer." }, { status: 400 });
    data.reflection = reflection;
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
