import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";
import { startOfDay, toDateInput } from "@/lib/dates";
import RatingForm from "./RatingForm";
import styles from "./rating.module.css";

export const dynamic = "force-dynamic";

const STUCK_LABEL: Record<string, string> = { yes: "Yes", partial: "Partly", no: "No" };
const STUCK_CLASS: Record<string, string> = { yes: styles.stuckYes, partial: styles.stuckPartial, no: styles.stuckNo };

export default async function RatingPage() {
  const identity = await requireHousehold();
  const userId = identity.user.id;
  const today = startOfDay(new Date());

  const [todayEntry, history] = await Promise.all([
    prisma.dailyRating.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.dailyRating.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 21 }),
  ]);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>Daily rating</h1>
        <Link href="/health" className={styles.back}>← Health</Link>
      </div>

      <RatingForm
        today={toDateInput(today)}
        initial={{
          stuckToPlan: todayEntry?.stuckToPlan ?? null,
          energyMood: todayEntry?.energyMood ?? null,
          note: todayEntry?.note ?? null,
        }}
      />

      <section className={`card ${styles.list}`}>
        <h2 className={styles.listTitle}>Recent days</h2>
        <p className={styles.listHint}>Look for patterns over time, not any single day.</p>
        {history.length === 0 ? (
          <p className={styles.empty}>No history yet.</p>
        ) : (
          history.map((entry) => (
            <div key={entry.id} className={styles.historyRow}>
              <span className={styles.historyDate}>
                {new Date(entry.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
              </span>
              {entry.stuckToPlan && (
                <span className={`${styles.historyStuck} ${STUCK_CLASS[entry.stuckToPlan] ?? ""} ${styles.active}`}>
                  {STUCK_LABEL[entry.stuckToPlan] ?? entry.stuckToPlan}
                </span>
              )}
              {entry.energyMood != null && <span className={styles.historyEnergy}>Energy {entry.energyMood}/5</span>}
              {entry.note && <span className={styles.historyNote}>{entry.note}</span>}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
