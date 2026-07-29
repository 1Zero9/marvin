import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";
import { startOfDay, daysBetween } from "@/lib/dates";
import styles from "./health.module.css";

export const dynamic = "force-dynamic";

export default async function HealthHubPage() {
  const identity = await requireHousehold();
  const userId = identity.user.id;
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

  const tiles = [
    {
      href: "/health/weight",
      icon: "⚖️",
      title: "Weight",
      desc: "Log your weight and see the trend",
      stat: kgToGo == null ? null : kgToGo <= 0 ? "Goal reached" : `${kgToGo} kg to go`,
    },
    {
      href: "/health/alcohol",
      icon: "🥂",
      title: "Alcohol",
      desc: "Zero and moderate phases, logged daily",
      stat: streak == null ? "Start tracking" : `${streak} ${streak === 1 ? "day" : "days"} since last drink`,
    },
    {
      href: "/health/workouts",
      icon: "🤸",
      title: "Workouts",
      desc: "10-15 min bodyweight sessions, ankle & back safe",
      stat: `${weekSessions} session${weekSessions === 1 ? "" : "s"} this week`,
    },
    {
      href: "/health/checklist",
      icon: "✅",
      title: "Daily checklist",
      desc: "Your non-negotiables, ticked off",
      stat: checklistTotal > 0 ? `${checklistDone}/${checklistTotal} today` : "Set up your list",
    },
    {
      href: "/health/rating",
      icon: "🙂",
      title: "Daily rating",
      desc: "Stuck to plan? How's your energy?",
      stat: todayRating ? "Logged today" : "Not logged today",
    },
  ];

  return (
    <div className={styles.wrap}>
      <div>
        <h1 className={styles.title}>Health</h1>
        <p className={styles.sub}>Matter-of-fact tracking. No guilt, no streaks pressure beyond what you want.</p>
      </div>
      <div className={styles.grid}>
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href} className={`card ${styles.tile}`}>
            <div className={styles.tileTop}>
              <span className={styles.icon}>{tile.icon}</span>
              <h2 className={styles.tileTitle}>{tile.title}</h2>
            </div>
            <p className={styles.tileDesc}>{tile.desc}</p>
            {tile.stat && <span className={styles.stat}>{tile.stat}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
