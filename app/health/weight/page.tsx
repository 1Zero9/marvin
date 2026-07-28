import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";
import { formatStoneLbs } from "@/lib/units";
import WeightChart from "./WeightChart";
import { AddWeightForm, DeleteEntryButton, GoalForm } from "./WeightForm";
import styles from "./weight.module.css";

export const dynamic = "force-dynamic";

export default async function WeightPage() {
  const identity = await requireHousehold();
  const userId = identity.user.id;

  const [logs, goal] = await Promise.all([
    prisma.weightLog.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.userGoal.findUnique({ where: { userId } }),
  ]);

  const chronological = logs.map((log) => ({ date: log.date, weightKg: log.weightKg }));
  const recent = [...logs].reverse();
  const latest = recent[0] ?? null;
  const kgToGo = latest && goal ? Math.round((latest.weightKg - goal.targetWeightKg) * 10) / 10 : null;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>Weight</h1>
        <Link href="/health" className={styles.back}>← Health</Link>
      </div>

      <section className={`card ${styles.goalCard}`}>
        <div className={styles.goalTop}>
          <div>
            {latest && goal ? (
              <>
                <p className={styles.progress}>{kgToGo != null && kgToGo <= 0 ? "Goal reached 🎉" : `${kgToGo} kg to go`}</p>
                <p className={styles.progressSub}>
                  Latest: {latest.weightKg} kg ({formatStoneLbs(latest.weightKg)}) · Target: {goal.targetWeightKg} kg ({formatStoneLbs(goal.targetWeightKg)})
                </p>
              </>
            ) : (
              <p className={styles.progressSub}>Set a target weight to track progress.</p>
            )}
          </div>
          <GoalForm targetWeightKg={goal?.targetWeightKg ?? null} heightCm={goal?.heightCm ?? null} />
        </div>
      </section>

      {chronological.length >= 2 && (
        <section className={`card ${styles.chartCard}`}>
          <div className={styles.legend}>
            <span className={styles.legendDot}><span className={`${styles.dot} ${styles.dotAvg}`} /> 7-day average</span>
            {goal && <span className={styles.legendDot}><span className={`${styles.dot} ${styles.dotTarget}`} /> Target</span>}
          </div>
          <WeightChart points={chronological} targetKg={goal?.targetWeightKg ?? null} />
        </section>
      )}

      <AddWeightForm />

      <section className={`card ${styles.list}`}>
        <h2 className={styles.listTitle}>Entries</h2>
        {recent.length === 0 ? (
          <p className={styles.empty}>No entries yet — add your first weigh-in above.</p>
        ) : (
          recent.map((log) => (
            <div key={log.id} className={styles.entry}>
              <div className={styles.entryLeft}>
                <span className={styles.entryWeight}>{log.weightKg} kg <span className={styles.entryNotes}>({formatStoneLbs(log.weightKg)})</span></span>
                {log.notes && <span className={styles.entryNotes}>{log.notes}</span>}
              </div>
              <div className={styles.entryLeft} style={{ alignItems: "flex-end" }}>
                <span className={styles.entryDate}>{new Date(log.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
                <DeleteEntryButton id={log.id} />
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
