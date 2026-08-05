import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { mondayOf, startOfDay } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { visibleTo } from "@/lib/privacy";
import { shoppingItemsFromIngredients } from "@/lib/shopping";
import { API_LIMITS } from "@/lib/apiLimits";
import { InvalidRequestBodyError, objectBody, readJsonBody } from "@/lib/requestSecurity";

export async function POST(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  let body: Record<string, unknown> | null;
  try {
    body = objectBody(await readJsonBody(req, API_LIMITS.smallJsonBytes));
  } catch (error) {
    if (error instanceof InvalidRequestBodyError) return NextResponse.json({ error: "Choose a recipe" }, { status: 400 });
    throw error;
  }
  const recipeId = typeof body?.recipeId === "string" ? body.recipeId : "";
  if (!recipeId || recipeId.length > API_LIMITS.identifier) return NextResponse.json({ error: "Choose a recipe" }, { status: 400 });

  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, householdId: identity.membership.householdId, ...visibleTo(identity) },
    select: { ingredients: true },
  });
  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

  const parsed = shoppingItemsFromIngredients([recipe.ingredients]);
  if (parsed.length === 0) {
    return NextResponse.json({ error: "This recipe has no ingredients to add." }, { status: 400 });
  }

  const weekStartDate = mondayOf(startOfDay(new Date()));
  const existing = await prisma.shoppingListItem.findMany({
    where: { userId: identity.user.id, weekStartDate },
    select: { ingredient: true },
  });
  const existingKeys = new Set(existing.map((item) => item.ingredient.toLowerCase().trim()));
  const toAdd = parsed.filter((item) => !existingKeys.has(item.ingredient.toLowerCase().trim()));

  if (toAdd.length > 0) {
    await prisma.shoppingListItem.createMany({
      data: toAdd.map((item) => ({
        userId: identity.user.id,
        weekStartDate,
        ingredient: item.ingredient,
        quantity: item.quantity,
        source: "manual",
      })),
    });
  }

  return NextResponse.json({ added: toAdd.length });
}
