import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";
import { addDays, daysBetween, mondayOf, startOfDay, toDateInput } from "@/lib/dates";
import TodayLog from "./TodayLog";
import PhaseActions from "./PhaseActions";
import styles from "./alcohol.module.css";

export const dynamic = "force-dynamic";

export default async function AlcoholPage() {
  const identity = await requireHousehold();
  const userId = identity.user.id;
  const today = startOfDay(new Date());
  const todayStr = toDateInput(today);

  const [activePhase, allPhases, todayLog, lastDrinkLog, allLogs] = await Promise.all([
    prisma.alcoholPhase.findFirst({ where: { userId, active: true } }),
    prisma.alcoholPhase.findMany({ where: { userId }, orderBy: { startDate: "desc" } }),
    prisma.alcoholLog.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.alcoholLog.findFirst({ where: { userId, hadDrink: true }, orderBy: { date: "desc" } }),
    prisma.alcoholLog.findMany({ where: { userId }, orderBy: { date: "asc" } }),
  ]);

  const streak = lastDrinkLog ? daysBetween(today, lastDrinkLog.date) : null;

  const isZeroComplete = !!(activePhase?.type === "zero" && activePhase.endDate && today > startOfDay(activePhase.endDate));
  const dayNumber = activePhase?.type === "zero" ? daysBetween(today, activePhase.startDate) + 1 : null;
  const daysRemaining = activePhase?.type === "zero" && activePhase.endDate
    ? Math.max(0, daysBetween(startOfDay(activePhase.endDate), today))
    : null;

  let weekUnits: number | null = null;
  if (activePhase?.type === "moderate") {
    const weekStart = mondayOf(today);
    const weekEnd = addDays(weekStart, 6);
    weekUnits = allLogs
      .filter((log) => log.date >= weekStart && log.date <= weekEnd)
      .reduce((sum, log) => sum + (log.units ?? 0), 0);
    weekUnits = Math.round(weekUnits * 10) / 10;
  }

  const phaseStats = allPhases.map((phase) => {
    const upper = phase.endDate ? startOfDay(phase.endDate) : today;
    const logsInRange = allLogs.filter((log) => log.date >= phase.startDate && log.date <= upper);
    if (phase.type === "zero") {
      const drinkDays = logsInRange.filter((log) => log.hadDrink).length;
      const totalDays = daysBetween(upper, phase.startDate) + 1;
      return { stat: drinkDays === 0 ? `${totalDays} days, no drinks logged` : `${drinkDays} of ${totalDays} days had a drink logged` };
    }
    const totalUnits = logsInRange.reduce((sum, log) => sum + (log.units ?? 0), 0);
    const totalDays = daysBetween(upper, phase.startDate) + 1;
    const avgWeekly = totalDays > 0 ? Math.round((totalUnits / totalDays) * 7 * 10) / 10 : 0;
    return { stat: `Avg ${avgWeekly} units/week${phase.weeklyUnitTarget != null ? ` (target ${phase.weeklyUnitTarget})` : ""}` };
  });

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>Alcohol</h1>
        <Link href="/health" className={styles.back}>← Health</Link>
      </div>

      <section className={`card ${styles.streakCard}`}>
        <div>
          <div className={styles.streakNumber}>{streak ?? "–"}</div>
          <div className={styles.streakLabel}>{streak === 1 ? "day" : "days"} since last drink</div>
        </div>
      </section>

      <TodayLog
        today={todayStr}
        initial={todayLog ? { hadDrink: todayLog.hadDrink, units: todayLog.units, notes: todayLog.notes } : null}
      />

      <PhaseActions
        today={todayStr}
        activePhase={
          activePhase
            ? {
                id: activePhase.id,
                type: activePhase.type as "zero" | "moderate",
                startDate: toDateInput(activePhase.startDate),
                endDate: activePhase.endDate ? toDateInput(activePhase.endDate) : null,
                weeklyUnitTarget: activePhase.weeklyUnitTarget,
              }
            : null
        }
        isZeroComplete={isZeroComplete}
        dayNumber={dayNumber}
        daysRemaining={daysRemaining}
        weekUnits={weekUnits}
      />

      <section className={`card ${styles.timeline}`}>
        <h2 className={styles.timelineTitle}>Timeline</h2>
        {allPhases.length === 0 ? (
          <p className={styles.empty}>No phases yet. Start your first zero period whenever you're ready.</p>
        ) : (
          allPhases.map((phase, i) => (
            <div key={phase.id} className={styles.phaseRow}>
              <div className={styles.phaseRowLeft}>
                <span className={styles.phaseType}>{phase.type === "zero" ? "Zero period" : "Moderate phase"}</span>
                <span className={styles.phaseRange}>
                  {new Date(phase.startDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  {" – "}
                  {phase.endDate ? new Date(phase.endDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "ongoing"}
                </span>
              </div>
              <span className={styles.phaseStat}>{phaseStats[i].stat}</span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
