import Link from "next/link";
import { requireHousehold } from "@/lib/auth";
import { addDays, mondayOf, startOfDay, toDateInput } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { visibleTo } from "@/lib/privacy";
import PlanBoard from "./PlanBoard";
import styles from "./plan.module.css";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const identity = await requireHousehold();
  const weekStart = mondayOf(startOfDay(new Date()));
  const weekEnd = addDays(weekStart, 7);
  const [entries, recipes] = await Promise.all([
    prisma.mealPlanEntry.findMany({
      where: { userId: identity.user.id, date: { gte: weekStart, lt: weekEnd } },
      select: { date: true, mealType: true, recipeId: true, freeformText: true },
    }),
    prisma.recipe.findMany({
      where: { householdId: identity.membership.householdId, archived: false, ...visibleTo(identity) },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
      take: 250,
    }),
  ]);
  const recipeTitles = new Map(recipes.map((recipe) => [recipe.id, recipe.title]));
  const days = Array.from({ length: 7 }, (_, offset) => {
    const date = addDays(weekStart, offset);
    return { date: toDateInput(date), label: date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" }) };
  });
  const initialItems = entries.map((entry) => ({
    date: toDateInput(entry.date),
    mealType: entry.mealType as "breakfast" | "lunch",
    recipeId: entry.recipeId,
    freeformText: entry.freeformText,
    label: entry.recipeId ? recipeTitles.get(entry.recipeId) ?? "Recipe no longer available" : entry.freeformText ?? "Meal",
  }));

  return (
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Your week</p>
        <h1>Make “what do I eat?” easier</h1>
        <p>Plan a few breakfasts and lunches before they become decisions. Use a recipe you can see, or simply write down what will work.</p>
      </header>
      <div className={styles.note}>
        <span>🔒</span>
        <p>This plan is private to you. Dinner and shared cooking stay in <Link href="/cook">your household kitchen</Link>. <Link href="/shopping">Make this week&rsquo;s shopping list →</Link></p>
      </div>
      <PlanBoard days={days} recipes={recipes} initialItems={initialItems} />
    </div>
  );
}
