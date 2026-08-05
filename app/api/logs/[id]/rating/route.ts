import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { API_LIMITS, optionalBoundedText } from "@/lib/apiLimits";
import { readJsonObject } from "@/lib/requestSecurity";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const body = await readJsonObject(req, API_LIMITS.smallJsonBytes).catch(() => null);
  const rating = typeof body?.rating === "number" && body.rating >= 1 && body.rating <= 5 ? Math.round(body.rating) : null;
  const notes = optionalBoundedText(body?.notes, 2_000);
  if (notes === undefined) return NextResponse.json({ error: "Rating notes must be 2,000 characters or fewer." }, { status: 400 });
  if (!rating) return NextResponse.json({ error: "Choose a rating from 1 to 5." }, { status: 400 });
  const log = await prisma.cookLog.findFirst({ where: { id, recipe: { householdId: identity.membership.householdId } } });
  if (!log) return NextResponse.json({ error: "Meal not found" }, { status: 404 });
  const mealRating = await prisma.mealRating.upsert({ where: { cookLogId_userId: { cookLogId: id, userId: identity.user.id } }, create: { cookLogId: id, userId: identity.user.id, rating, notes }, update: { rating, notes } });
  return NextResponse.json(mealRating);
}
