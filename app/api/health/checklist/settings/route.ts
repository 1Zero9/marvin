import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { API_LIMITS, boundedStringList } from "@/lib/apiLimits";
import { InvalidRequestBodyError, objectBody, readJsonBody } from "@/lib/requestSecurity";

export async function PUT(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  let body: Record<string, unknown> | null;
  try {
    body = objectBody(await readJsonBody(req, API_LIMITS.smallJsonBytes));
  } catch (error) {
    if (error instanceof InvalidRequestBodyError) return NextResponse.json({ error: "Invalid checklist settings" }, { status: 400 });
    throw error;
  }

  const labels = boundedStringList(body?.labels, { maximumItems: 4, maximumLength: 60 });
  if (!labels || labels.length === 0) {
    return NextResponse.json({ error: "Add at least one item" }, { status: 400 });
  }

  const userId = identity.user.id;
  const settings = await prisma.checklistSettings.upsert({
    where: { userId },
    update: { labels },
    create: { userId, labels },
  });
  return NextResponse.json(settings, { status: 201 });
}
