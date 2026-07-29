import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { addDays, fromDateInput, mondayOf, startOfDay } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { visibleTo } from "@/lib/privacy";
import { shoppingItemsFromIngredients } from "@/lib/shopping";

function weekStart(value: unknown) {
  if (typeof value !== "string") return null;
  const date = mondayOf(startOfDay(fromDateInput(value)));
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json();
  const startDate = weekStart(body?.weekStart);
  if (!startDate) return NextResponse.json({ error: "Choose a valid week" }, { status: 400 });

  const entries = await prisma.mealPlanEntry.findMany({
    where: { userId: identity.user.id, date: { gte: startDate, lt: addDays(startDate, 7) }, recipeId: { not: null } },
    select: { recipeId: true },
  });
  const recipeIds = [...new Set(entries.flatMap((entry) => entry.recipeId ? [entry.recipeId] : []))];
  const recipes = recipeIds.length ? await prisma.recipe.findMany({
    where: { id: { in: recipeIds }, householdId: identity.membership.householdId, ...visibleTo(identity) },
    select: { ingredients: true },
  }) : [];
  const generated = shoppingItemsFromIngredients(recipes.map((recipe) => recipe.ingredients));

  await prisma.$transaction([
    prisma.shoppingListItem.deleteMany({ where: { userId: identity.user.id, weekStartDate: startDate, source: "auto" } }),
    ...(generated.length ? [prisma.shoppingListItem.createMany({
      data: generated.map((item) => ({ userId: identity.user.id, weekStartDate: startDate, ingredient: item.ingredient, quantity: item.quantity, source: "auto" })),
    })] : []),
  ]);
  const items = await prisma.shoppingListItem.findMany({
    where: { userId: identity.user.id, weekStartDate: startDate },
    orderBy: [{ checked: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ items, generated: generated.length });
}
