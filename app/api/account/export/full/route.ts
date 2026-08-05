import { currentMembership } from "@/lib/auth";
import { visibleTo } from "@/lib/privacy";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function GET() {
  const identity = await currentMembership();
  if (!identity) return new Response(JSON.stringify({ error: "Sign in required" }), { status: 401 });
  const rateLimit = await enforceRateLimit({ namespace: "account:export-full", identifier: identity.user.id, limit: 5, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const userId = identity.user.id;
  const householdId = identity.membership.householdId;
  const visibility = visibleTo(identity);

  const [
    user,
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
    mealPlanEntries,
    shoppingListItems,
    swapSuggestions,
    recipeVariants,
    myCookLogs,
    recipes,
    books,
    householdCookLogs,
  ] = await Promise.all([
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
    prisma.recipe.findMany({
      where: { householdId, archived: false, ...visibility },
      orderBy: { createdAt: "asc" },
      select: {
        title: true,
        source: true,
        pageRef: true,
        ingredients: true,
        instructions: true,
        notes: true,
        tags: true,
        links: true,
        visibility: true,
        createdAt: true,
        book: { select: { title: true, author: true } },
        createdBy: { select: { displayName: true } },
      },
    }),
    prisma.book.findMany({
      where: { householdId, archived: false, ...visibility },
      orderBy: { createdAt: "asc" },
      select: {
        title: true,
        author: true,
        isbn: true,
        pageCount: true,
        favourite: true,
        visibility: true,
        createdAt: true,
        createdBy: { select: { displayName: true } },
        indexEntries: { select: { ingredient: true, dish: true, page: true } },
      },
    }),
    prisma.cookLog.findMany({
      where: { recipe: { householdId, archived: false, ...visibility } },
      orderBy: { cookedAt: "asc" },
      select: {
        cookedAt: true,
        countsAsCooked: true,
        rating: true,
        notes: true,
        context: true,
        venue: true,
        tags: true,
        recipe: { select: { title: true } },
        cookedBy: { select: { displayName: true } },
      },
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
    personalCookingHistory: myCookLogs,
    household: {
      recipes,
      books,
      cookLogs: householdCookLogs,
    },
  }, null, 2);

  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="marvin-full-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
