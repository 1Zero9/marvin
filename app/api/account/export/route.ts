import { currentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const identity = await currentMembership();
  if (!identity) return new Response(JSON.stringify({ error: "Sign in required" }), { status: 401 });

  const userId = identity.user.id;
  const [user, weightLogs, goal, alcoholLogs, alcoholPhases, workoutSessions, checklists, checklistSettings, ratings, dailyCompanions, weeklyReflections, mealPlanEntries, shoppingListItems, swapSuggestions, recipeVariants, cookLogs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { displayName: true, email: true, createdAt: true } }),
    prisma.weightLog.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.userGoal.findUnique({ where: { userId } }),
    prisma.alcoholLog.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.alcoholPhase.findMany({ where: { userId }, orderBy: { startDate: "asc" } }),
    prisma.workoutSession.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.dailyChecklist.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.checklistSettings.findUnique({ where: { userId } }),
    prisma.dailyRating.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.dailyCompanion.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.weeklyReflection.findMany({ where: { userId }, orderBy: { weekStart: "asc" } }),
    prisma.mealPlanEntry.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.shoppingListItem.findMany({ where: { userId }, orderBy: { weekStartDate: "asc" } }),
    prisma.recipeSwapSuggestion.findMany({
      where: { userId },
      orderBy: { generatedAt: "asc" },
      select: { suggestions: true, generatedAt: true, recipe: { select: { title: true } } },
    }),
    prisma.recipeVariant.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { name: true, ingredients: true, notes: true, createdAt: true, originalRecipe: { select: { title: true } } },
    }),
    prisma.cookLog.findMany({
      where: { cookedById: userId },
      orderBy: { cookedAt: "asc" },
      select: { cookedAt: true, countsAsCooked: true, rating: true, notes: true, context: true, venue: true, tags: true, recipe: { select: { title: true } } },
    }),
  ]);

  const body = JSON.stringify({
    exportedAt: new Date().toISOString(),
    profile: user,
    privateHealth: {
      weightLogs,
      goal,
      alcoholLogs,
      alcoholPhases,
      workoutSessions,
      checklists,
      checklistSettings,
      ratings,
      dailyCompanions,
      weeklyReflections,
    },
    privateFoodPlanning: {
      mealPlanEntries,
      shoppingListItems,
    },
    privateRecipeEnhancements: {
      swapSuggestions,
      recipeVariants,
    },
    personalCookingHistory: cookLogs,
  }, null, 2);

  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="marvin-personal-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
