import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { canManage, visibleTo } from "@/lib/privacy";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id: targetId } = await params;
  const body = await req.json();
  const sourceId = typeof body?.sourceId === "string" ? body.sourceId : "";
  if (!sourceId || sourceId === targetId) return NextResponse.json({ error: "Choose a different recipe to merge." }, { status: 400 });
  const [target, source] = await Promise.all([
    prisma.recipe.findFirst({ where: { id: targetId, householdId: identity.membership.householdId, ...visibleTo(identity) } }),
    prisma.recipe.findFirst({ where: { id: sourceId, householdId: identity.membership.householdId, ...visibleTo(identity) } }),
  ]);
  if (!target || !source) return NextResponse.json({ error: "One of those recipes is not available." }, { status: 404 });
  if (!canManage(identity, target.createdById) || !canManage(identity, source.createdById)) return NextResponse.json({ error: "You can only merge recipes you are allowed to manage." }, { status: 403 });

  await prisma.$transaction(async (tx) => {
    const planEntries = await tx.mealPlanEntry.findMany({ where: { recipeId: sourceId } });
    for (const entry of planEntries) {
      const targetEntry = await tx.mealPlanEntry.findFirst({ where: { userId: entry.userId, date: entry.date, mealType: entry.mealType, recipeId: targetId } });
      if (targetEntry) await tx.mealPlanEntry.delete({ where: { id: entry.id } });
      else await tx.mealPlanEntry.update({ where: { id: entry.id }, data: { recipeId: targetId } });
    }
    const suggestions = await tx.recipeSwapSuggestion.findMany({ where: { recipeId: sourceId } });
    for (const suggestion of suggestions) {
      const duplicate = await tx.recipeSwapSuggestion.findFirst({ where: { recipeId: targetId, userId: suggestion.userId } });
      if (duplicate) await tx.recipeSwapSuggestion.delete({ where: { id: suggestion.id } });
      else await tx.recipeSwapSuggestion.update({ where: { id: suggestion.id }, data: { recipeId: targetId } });
    }
    const variants = await tx.recipeVariant.findMany({ where: { originalRecipeId: sourceId } });
    for (const variant of variants) {
      const duplicate = await tx.recipeVariant.findFirst({ where: { originalRecipeId: targetId, userId: variant.userId } });
      if (duplicate) await tx.recipeVariant.delete({ where: { id: variant.id } });
      else await tx.recipeVariant.update({ where: { id: variant.id }, data: { originalRecipeId: targetId } });
    }
    await tx.photo.updateMany({ where: { recipeId: sourceId }, data: { recipeId: targetId } });
    await tx.cookLog.updateMany({ where: { recipeId: sourceId }, data: { recipeId: targetId } });
    await tx.recipe.delete({ where: { id: sourceId } });
  });
  return NextResponse.json({ ok: true, recipeId: targetId });
}
