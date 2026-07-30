import Link from "next/link";
import { requireHousehold } from "@/lib/auth";
import { addDays, mondayOf, startOfDay, toDateInput } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import TodayActions from "./TodayActions";
import styles from "./today.module.css";

export const dynamic = "force-dynamic";

const DEFAULT_LABELS = ["No alcohol", "One workout", "Drink water", "Short walk"];

function greetingFor(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function TodayPage() {
  const identity = await requireHousehold();
  const now = new Date();
  const today = startOfDay(now);
  const userId = identity.user.id;
  const weekStart = addDays(today, -6);
  const currentWeekStart = mondayOf(today);

  const [checkIn, settings, checklist, rating, workoutCount, weekCheckIns, weeklyReflection] = await Promise.all([
    prisma.dailyCompanion.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.checklistSettings.findUnique({ where: { userId } }),
    prisma.dailyChecklist.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.dailyRating.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.workoutSession.count({ where: { userId, date: { gte: weekStart } } }),
    prisma.dailyCompanion.count({ where: { userId, date: { gte: weekStart } } }),
    prisma.weeklyReflection.findUnique({ where: { userId_weekStart: { userId, weekStart: currentWeekStart } } }),
  ]);

  const labels = settings?.labels.length ? settings.labels : DEFAULT_LABELS;
  const checklistItems = (checklist?.items as Record<string, boolean> | undefined) ?? {};
  const firstName = identity.user.displayName.trim().split(/\s+/)[0];
  const dateLabel = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const weekLine = workoutCount || weekCheckIns
    ? `${workoutCount} movement${workoutCount === 1 ? " session" : " sessions"} · ${weekCheckIns} check-in${weekCheckIns === 1 ? "" : "s"} this week`
    : "There is no score to catch up on — start with today.";
  return (
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <div className={styles.heroTop}><p className={styles.date}>{dateLabel}</p><span className={styles.privatePill}>Private to you</span></div>
        <h1>{greetingFor(now)}, {firstName}.</h1>
        <p className={styles.intro}>A little attention for the day ahead. Nothing to win, nothing to make up for.</p>
      </header>

      <TodayActions
        today={toDateInput(today)}
        checkIn={{ intention: checkIn?.intention ?? null, waterGlasses: checkIn?.waterGlasses ?? 0, reflection: checkIn?.reflection ?? null }}
        rating={{ stuckToPlan: rating?.stuckToPlan ?? null, energyMood: rating?.energyMood ?? null }}
        labels={labels}
        initialChecklist={checklistItems}
      />

      {weeklyReflection?.experiment && (
        <Link href="/reflection" className={styles.experimentCard}>
          <div>
            <p className={styles.eyebrow}>This week&rsquo;s experiment</p>
            <h2 className={styles.sectionTitle}>{weeklyReflection.experiment}</h2>
          </div>
          <span>→</span>
        </Link>
      )}

      <section className={styles.chooseSection}>
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>A little more support</p><h2>What would help you?</h2></div>
        <div className={styles.choiceGrid}>
          <Link href="/health/workouts" className={styles.choiceCard}><span className={styles.choiceIcon}>↗</span><span><strong>Move a little</strong><small>Start a short session</small></span><b>→</b></Link>
          <Link href="/health" className={styles.choiceCard}><span className={styles.choiceIcon}>◌</span><span><strong>See your patterns</strong><small>Look at your own picture</small></span><b>→</b></Link>
          <Link href="/reflection" className={styles.choiceCard}><span className={styles.choiceIcon}>✎</span><span><strong>Take stock</strong><small>Review the week gently</small></span><b>→</b></Link>
        </div>
      </section>
      <div className={styles.footerRow}><p className={styles.weekLine}>{weekLine}</p><Link href="/reflection" className={styles.reflectionLink}>Weekly view →</Link></div>
      <p className={styles.privateNote}>This is your private space. Your shared kitchen lives in Cook and Library.</p>
    </div>
  );
}
