import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";
import { startOfDay, toDateInput } from "@/lib/dates";
import { TodayChecklist, ChecklistSettingsForm } from "./ChecklistForm";
import styles from "./checklist.module.css";

export const dynamic = "force-dynamic";

const DEFAULT_LABELS = ["No alcohol", "One workout", "Drink water", "Short walk"];

export default async function ChecklistPage() {
  const identity = await requireHousehold();
  const userId = identity.user.id;
  const today = startOfDay(new Date());

  const [settings, todayEntry, history] = await Promise.all([
    prisma.checklistSettings.findUnique({ where: { userId } }),
    prisma.dailyChecklist.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.dailyChecklist.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 14 }),
  ]);

  const labels = settings?.labels?.length ? settings.labels : DEFAULT_LABELS;
  const initialItems = (todayEntry?.items as Record<string, boolean>) ?? {};

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>Daily checklist</h1>
        <Link href="/health" className={styles.back}>← Health</Link>
      </div>

      <TodayChecklist today={toDateInput(today)} labels={labels} initialItems={initialItems} />
      <ChecklistSettingsForm labels={labels} />

      <section className={`card ${styles.list}`}>
        <h2 className={styles.listTitle}>Recent days</h2>
        {history.length === 0 ? (
          <p className={styles.empty}>No history yet.</p>
        ) : (
          history.map((entry) => {
            const items = (entry.items as Record<string, boolean>) ?? {};
            const done = Object.keys(items).filter((k) => items[k]);
            return (
              <div key={entry.id} className={styles.historyRow}>
                <span className={styles.historyDate}>
                  {new Date(entry.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </span>
                {done.length === 0 ? (
                  <span className={styles.historyEmpty}>Nothing ticked</span>
                ) : (
                  <div className={styles.historyTags}>
                    {done.map((label) => (
                      <span key={label} className={styles.historyTag}>{label}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
