import { prisma } from "@/lib/prisma";
import { startOfDay, daysBetween } from "@/lib/dates";
import type { IconName } from "@/components/Icon";

export type HealthTile = {
  href: string;
  icon: IconName;
  title: string;
  desc: string;
  stat: string | null;
};

export async function getHealthSummary(userId: string): Promise<HealthTile[]> {
  const today = startOfDay(new Date());

  const [latestWeight, goal, lastDrinkLog, weekSessions, checklist, checklistSettings, todayRating] =
    await Promise.all([
      prisma.weightLog.findFirst({ where: { userId }, orderBy: { date: "desc" } }),
      prisma.userGoal.findUnique({ where: { userId } }),
      prisma.alcoholLog.findFirst({ where: { userId, hadDrink: true }, orderBy: { date: "desc" } }),
      prisma.workoutSession.count({ where: { userId, date: { gte: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000) } } }),
      prisma.dailyChecklist.findUnique({ where: { userId_date: { userId, date: today } } }),
      prisma.checklistSettings.findUnique({ where: { userId } }),
      prisma.dailyRating.findUnique({ where: { userId_date: { userId, date: today } } }),
    ]);

  const kgToGo = latestWeight && goal ? Math.round((latestWeight.weightKg - goal.targetWeightKg) * 10) / 10 : null;
  const streak = lastDrinkLog ? daysBetween(today, lastDrinkLog.date) : null;

  const checklistItems = (checklist?.items as Record<string, boolean> | undefined) ?? {};
  const checklistTotal = checklistSettings?.labels.length ?? Object.keys(checklistItems).length;
  const checklistDone = Object.values(checklistItems).filter(Boolean).length;

  return [
    {
      href: "/health/weight",
      icon: "weight",
      title: "Weight",
      desc: "Log your weight and see the trend",
      stat: kgToGo == null ? null : kgToGo <= 0 ? "Goal reached" : `${kgToGo} kg to go`,
    },
    {
      href: "/health/alcohol",
      icon: "alcohol",
      title: "Alcohol",
      desc: "Zero and moderate phases, logged daily",
      stat: streak == null ? "Start tracking" : `${streak} ${streak === 1 ? "day" : "days"} since last drink`,
    },
    {
      href: "/health/workouts",
      icon: "workouts",
      title: "Workouts",
      desc: "10-15 min bodyweight sessions, ankle & back safe",
      stat: `${weekSessions} session${weekSessions === 1 ? "" : "s"} this week`,
    },
    {
      href: "/health/checklist",
      icon: "checklist",
      title: "Daily checklist",
      desc: "Your non-negotiables, ticked off",
      stat: checklistTotal > 0 ? `${checklistDone}/${checklistTotal} today` : "Set up your list",
    },
    {
      href: "/health/rating",
      icon: "rating",
      title: "Daily rating",
      desc: "Stuck to plan? How's your energy?",
      stat: todayRating ? "Logged today" : "Not logged today",
    },
  ];
}
