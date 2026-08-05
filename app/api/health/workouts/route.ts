import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { fromDateInput, startOfDay } from "@/lib/dates";
import { API_LIMITS, boundedStringList, optionalBoundedText } from "@/lib/apiLimits";
import { InvalidRequestBodyError, objectBody, readJsonBody } from "@/lib/requestSecurity";

export async function POST(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  let body: Record<string, unknown> | null;
  try {
    body = objectBody(await readJsonBody(req, API_LIMITS.smallJsonBytes));
  } catch (error) {
    if (error instanceof InvalidRequestBodyError) return NextResponse.json({ error: "Invalid workout" }, { status: 400 });
    throw error;
  }

  const exerciseIds = boundedStringList(body?.exerciseIds, { maximumItems: 20, maximumLength: API_LIMITS.identifier });
  if (!exerciseIds || exerciseIds.length === 0 || new Set(exerciseIds).size !== exerciseIds.length) {
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
  const notes = optionalBoundedText(body?.notes, 500);
  if (notes === undefined) return NextResponse.json({ error: "Workout notes must be 500 characters or fewer." }, { status: 400 });
  const validExercises = await prisma.exercise.count({ where: { id: { in: exerciseIds } } });
  if (validExercises !== exerciseIds.length) return NextResponse.json({ error: "One or more exercises are not available." }, { status: 400 });

  const session = await prisma.workoutSession.create({
    data: { userId: identity.user.id, date, durationMin: Math.round(durationMin), exerciseIds, notes },
  });
  return NextResponse.json(session, { status: 201 });
}
