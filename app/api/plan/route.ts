import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { fromDateInput, startOfDay } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { visibleTo } from "@/lib/privacy";

const mealTypes = ["breakfast", "lunch"] as const;

function validMealType(value: unknown): value is (typeof mealTypes)[number] {
  return typeof value === "string" && mealTypes.includes(value as (typeof mealTypes)[number]);
}

function planDate(value: unknown) {
  if (typeof value !== "string") return null;
  const date = startOfDay(fromDateInput(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function PUT(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = await req.json();
  const date = planDate(body?.date);
  if (!date || !validMealType(body?.mealType)) {
    return NextResponse.json({ error: "Choose a valid date and meal" }, { status: 400 });
  }

  const recipeId = typeof body?.recipeId === "string" && body.recipeId.trim() ? body.recipeId.trim() : null;
  const freeformText = typeof body?.freeformText === "string" ? body.freeformText.trim() : "";
  if ((recipeId && freeformText) || (!recipeId && !freeformText)) {
    return NextResponse.json({ error: "Choose a recipe or write a meal" }, { status: 400 });
  }
  if (freeformText.length > 160) {
    return NextResponse.json({ error: "Keep a meal note to 160 characters" }, { status: 400 });
  }

  if (recipeId) {
    const recipe = await prisma.recipe.findFirst({
      where: {
        id: recipeId,
        householdId: identity.membership.householdId,
        archived: false,
        ...visibleTo(identity),
      },
      select: { id: true },
    });
    if (!recipe) return NextResponse.json({ error: "That recipe is not available to you" }, { status: 404 });
  }

  const entry = await prisma.mealPlanEntry.upsert({
    where: { userId_date_mealType: { userId: identity.user.id, date, mealType: body.mealType } },
    update: { recipeId, freeformText: freeformText || null },
    create: { userId: identity.user.id, date, mealType: body.mealType, recipeId, freeformText: freeformText || null },
  });
  return NextResponse.json(entry);
}

export async function DELETE(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = await req.json();
  const date = planDate(body?.date);
  if (!date || !validMealType(body?.mealType)) {
    return NextResponse.json({ error: "Choose a valid date and meal" }, { status: 400 });
  }

  await prisma.mealPlanEntry.deleteMany({
    where: { userId: identity.user.id, date, mealType: body.mealType },
  });
  return new NextResponse(null, { status: 204 });
}
