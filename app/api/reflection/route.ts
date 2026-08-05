import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { fromDateInput, mondayOf } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { API_LIMITS } from "@/lib/apiLimits";
import { readJsonObject } from "@/lib/requestSecurity";

function clean(value: unknown, limit: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, limit) : null;
}

export async function PUT(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await readJsonObject(req, API_LIMITS.smallJsonBytes).catch(() => null);
  const supplied = body?.weekStart ? fromDateInput(body.weekStart) : new Date();
  if (Number.isNaN(supplied.getTime())) return NextResponse.json({ error: "Invalid week." }, { status: 400 });

  const weekStart = mondayOf(supplied);
  const reflection = await prisma.weeklyReflection.upsert({
    where: { userId_weekStart: { userId: identity.user.id, weekStart } },
    update: {
      win: clean(body?.win, 300),
      lesson: clean(body?.lesson, 400),
      experiment: clean(body?.experiment, 200),
    },
    create: {
      userId: identity.user.id,
      weekStart,
      win: clean(body?.win, 300),
      lesson: clean(body?.lesson, 400),
      experiment: clean(body?.experiment, 200),
    },
  });
  return NextResponse.json(reflection);
}
