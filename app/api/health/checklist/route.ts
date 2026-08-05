import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { fromDateInput, startOfDay } from "@/lib/dates";
import { API_LIMITS, booleanRecord } from "@/lib/apiLimits";
import { InvalidRequestBodyError, objectBody, readJsonBody } from "@/lib/requestSecurity";

export async function POST(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  let body: Record<string, unknown> | null;
  try {
    body = objectBody(await readJsonBody(req, API_LIMITS.smallJsonBytes));
  } catch (error) {
    if (error instanceof InvalidRequestBodyError) return NextResponse.json({ error: "Invalid checklist" }, { status: 400 });
    throw error;
  }

  const items = booleanRecord(body?.items, 10, 60);
  if (!items) return NextResponse.json({ error: "Invalid items" }, { status: 400 });
  const date = startOfDay(body?.date ? fromDateInput(body.date) : new Date());
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const userId = identity.user.id;
  const entry = await prisma.dailyChecklist.upsert({
    where: { userId_date: { userId, date } },
    update: { items },
    create: { userId, date, items },
  });
  return NextResponse.json(entry, { status: 201 });
}
