import Link from "next/link";
import { requireHousehold } from "@/lib/auth";
import { addDays, mondayOf, startOfDay, toDateInput } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import ReflectionForm from "./ReflectionForm";
import styles from "./reflection.module.css";

export const dynamic = "force-dynamic";

const DEFAULT_LABELS = ["No alcohol", "One workout", "Drink water", "Short walk"];

function average(values: number[]) {
  return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null;
}

export default async function ReflectionPage() {
  const identity = await requireHousehold();
  const userId = identity.user.id;
  const weekStart = mondayOf(new Date());
  const weekEnd = addDays(weekStart, 6);

  const [reflection, checkIns, ratings, alcoholLogs, workouts, checklists, settings, cooked] = await Promise.all([
    prisma.weeklyReflection.findUnique({ where: { userId_weekStart: { userId, weekStart } } }),
    prisma.dailyCompanion.findMany({ where: { userId, date: { gte: weekStart, lte: weekEnd } } }),
    prisma.dailyRating.findMany({ where: { userId, date: { gte: weekStart, lte: weekEnd } } }),
    prisma.alcoholLog.findMany({ where: { userId, date: { gte: weekStart, lte: weekEnd } } }),
    prisma.workoutSession.findMany({ where: { userId, date: { gte: weekStart, lte: weekEnd } } }),
    prisma.dailyChecklist.findMany({ where: { userId, date: { gte: weekStart, lte: weekEnd } } }),
    prisma.checklistSettings.findUnique({ where: { userId } }),
    prisma.cookLog.count({ where: { cookedById: userId, cookedAt: { gte: weekStart, lte: addDays(weekEnd, 1) } } }),
  ]);

  const labels = settings?.labels.length ? settings.labels : DEFAULT_LABELS;
  const checkInByDate = new Map(checkIns.map((entry) => [toDateInput(entry.date), entry]));
  const alcoholByDate = new Map(alcoholLogs.map((entry) => [toDateInput(entry.date), entry]));
  const completedItems = checklists.reduce((total, entry) => total + Object.values((entry.items as Record<string, boolean>) ?? {}).filter(Boolean).length, 0);
  const possibleItems = checklists.length * labels.length;
  const waterTotal = checkIns.reduce((sum, entry) => sum + entry.waterGlasses, 0);
  const workoutMinutes = workouts.reduce((sum, workout) => sum + workout.durationMin, 0);
  const drinkDays = alcoholLogs.filter((entry) => entry.hadDrink).length;
  const units = alcoholLogs.reduce((sum, entry) => sum + (entry.units ?? 0), 0);

  const observations: string[] = [];
  const planAndEnergy = ratings.flatMap((rating) => {
    if (rating.energyMood == null || !rating.stuckToPlan) return [];
    return [{ stuckToPlan: rating.stuckToPlan, energy: rating.energyMood }];
  });
  const planWentWellEnergy = planAndEnergy.filter((entry) => entry.stuckToPlan === "yes").map((entry) => entry.energy);
  const planWentDifferentlyEnergy = planAndEnergy.filter((entry) => entry.stuckToPlan !== "yes").map((entry) => entry.energy);
  if (planWentWellEnergy.length >= 2 && planWentDifferentlyEnergy.length >= 2) {
    observations.push(`On ${planWentWellEnergy.length} days you said your plan went well, energy averaged ${average(planWentWellEnergy)}/5; on ${planWentDifferentlyEnergy.length} other logged days it averaged ${average(planWentDifferentlyEnergy)}/5. That is a small pattern to notice, not proof that one caused the other.`);
  }

  const waterAndEnergy = ratings.flatMap((rating) => {
    if (rating.energyMood == null) return [];
    const water = checkInByDate.get(toDateInput(rating.date))?.waterGlasses;
    return water == null ? [] : [{ water, energy: rating.energyMood }];
  });
  const higherWater = waterAndEnergy.filter((entry) => entry.water >= 6).map((entry) => entry.energy);
  const lowerWater = waterAndEnergy.filter((entry) => entry.water < 6).map((entry) => entry.energy);
  if (higherWater.length >= 2 && lowerWater.length >= 2) {
    observations.push(`On ${higherWater.length} days with 6+ glasses logged, your energy averaged ${average(higherWater)}/5; on ${lowerWater.length} lower-water days it averaged ${average(lowerWater)}/5. That is a pattern to watch, not proof of cause.`);
  }

  const alcoholAndEnergy = ratings.flatMap((rating) => {
    if (rating.energyMood == null) return [];
    const alcohol = alcoholByDate.get(toDateInput(rating.date));
    return alcohol ? [{ hadDrink: alcohol.hadDrink, energy: rating.energyMood }] : [];
  });
  const noDrinkEnergy = alcoholAndEnergy.filter((entry) => !entry.hadDrink).map((entry) => entry.energy);
  const drinkEnergy = alcoholAndEnergy.filter((entry) => entry.hadDrink).map((entry) => entry.energy);
  if (noDrinkEnergy.length >= 2 && drinkEnergy.length >= 2) {
    observations.push(`On logged alcohol-free days, energy averaged ${average(noDrinkEnergy)}/5; on logged drinking days it averaged ${average(drinkEnergy)}/5. Keep noticing the context around those days.`);
  }
  if (observations.length === 0) {
    observations.push("There is not enough matching information yet to call a pattern. A few honest check-ins over time will make this more useful.");
  }

  const range = `${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Private weekly reflection</p>
          <h1>Your week, without the spin</h1>
          <p>{range}</p>
        </div>
        <Link href="/" className={styles.back}>← Today</Link>
      </header>

      <section className={styles.metricGrid} aria-label="This week’s record">
        <div className={`card ${styles.metric}`}><strong>{checkIns.length}</strong><span>daily check-ins</span></div>
        <div className={`card ${styles.metric}`}><strong>{waterTotal}</strong><span>glasses logged</span></div>
        <div className={`card ${styles.metric}`}><strong>{workoutMinutes}</strong><span>minutes moving</span></div>
        <div className={`card ${styles.metric}`}><strong>{drinkDays}</strong><span>drinking days</span></div>
      </section>

      <section className={`card ${styles.record}`}>
        <h2>The record</h2>
        <p>{workouts.length} workout{workouts.length === 1 ? "" : "s"} · {cooked} meal{cooked === 1 ? "" : "s"} cooked · {Math.round(units * 10) / 10} alcohol units logged · {possibleItems ? `${completedItems}/${possibleItems} non-negotiables ticked` : "no checklist days logged yet"}</p>
      </section>

      <section className={`card ${styles.observations}`}>
        <p className={styles.eyebrow}>What I notice</p>
        <h2>Only patterns your own entries support</h2>
        {observations.map((observation) => <p key={observation}>{observation}</p>)}
      </section>

      <ReflectionForm
        weekStart={toDateInput(weekStart)}
        initial={{ win: reflection?.win ?? null, lesson: reflection?.lesson ?? null, experiment: reflection?.experiment ?? null }}
      />
      <p className={styles.privateNote}>This reflection and its underlying health data are visible only to you.</p>
    </div>
  );
}
