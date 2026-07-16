import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const rating = typeof body?.rating === "number" && body.rating >= 1 && body.rating <= 5 ? Math.round(body.rating) : null;
  const notes = typeof body?.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 2000) : null;
  if (!rating) return NextResponse.json({ error: "Choose a rating from 1 to 5." }, { status: 400 });
  const log = await prisma.cookLog.findFirst({ where: { id, recipe: { householdId: identity.membership.householdId } } });
  if (!log) return NextResponse.json({ error: "Meal not found" }, { status: 404 });
  const mealRating = await prisma.mealRating.upsert({ where: { cookLogId_userId: { cookLogId: id, userId: identity.user.id } }, create: { cookLogId: id, userId: identity.user.id, rating, notes }, update: { rating, notes } });
  return NextResponse.json(mealRating);
}
