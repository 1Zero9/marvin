import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { visibleTo } from "@/lib/privacy";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const recipe = await prisma.recipe.findFirst({
    where: { id, householdId: identity.membership.householdId, ...visibleTo(identity) },
    select: { id: true, title: true, ingredients: true },
  });
  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  const suggestion = await prisma.recipeSwapSuggestion.findUnique({
    where: { userId_recipeId: { userId: identity.user.id, recipeId: recipe.id } },
    select: { suggestions: true },
  });
  if (!suggestion) return NextResponse.json({ error: "Find lighter options first." }, { status: 400 });

  const variant = await prisma.recipeVariant.upsert({
    where: { userId_originalRecipeId: { userId: identity.user.id, originalRecipeId: recipe.id } },
    update: {
      name: `Lighter ${recipe.title}`.slice(0, 160),
      ingredients: { originalIngredients: recipe.ingredients, swaps: suggestion.suggestions },
      notes: "A private set of optional lighter changes. Review the original recipe and choose what works for you.",
    },
    create: {
      userId: identity.user.id,
      originalRecipeId: recipe.id,
      name: `Lighter ${recipe.title}`.slice(0, 160),
      ingredients: { originalIngredients: recipe.ingredients, swaps: suggestion.suggestions },
      notes: "A private set of optional lighter changes. Review the original recipe and choose what works for you.",
    },
  });
  return NextResponse.json({ id: variant.id, name: variant.name });
}
