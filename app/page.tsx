import Link from "next/link";
import { requireHousehold } from "@/lib/auth";
import { addDays, mondayOf, startOfDay, toDateInput } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { visibleTo } from "@/lib/privacy";
import { photoMediaUrl } from "@/lib/media";
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

function cookingReason(recipe: { cookLogs: { cookedAt: Date; rating: number | null }[]; tags: string[] }) {
  const ratings = recipe.cookLogs.filter((log) => log.rating != null);
  const average = ratings.length
    ? ratings.reduce((sum, log) => sum + (log.rating ?? 0), 0) / ratings.length
    : null;
  const lastCooked = recipe.cookLogs[0]?.cookedAt;
  if (average && average >= 4) return `${average.toFixed(1)} ★ from past cooks`;
  if (!lastCooked) return "Ready for its first cook";
  const months = Math.floor((Date.now() - lastCooked.getTime()) / (30 * 24 * 60 * 60 * 1000));
  if (months >= 2) return `Not made for ${months} months`;
  if (recipe.tags.includes("quick")) return "One of your quick recipes";
  return `Made ${recipe.cookLogs.length} ${recipe.cookLogs.length === 1 ? "time" : "times"}`;
}

export default async function TodayPage() {
  const identity = await requireHousehold();
  const now = new Date();
  const today = startOfDay(now);
  const userId = identity.user.id;
  const weekStart = addDays(today, -6);
  const currentWeekStart = mondayOf(today);

  const [checkIn, settings, checklist, rating, workoutCount, weekCheckIns, recipes, weeklyReflection] = await Promise.all([
    prisma.dailyCompanion.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.checklistSettings.findUnique({ where: { userId } }),
    prisma.dailyChecklist.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.dailyRating.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.workoutSession.count({ where: { userId, date: { gte: weekStart } } }),
    prisma.dailyCompanion.count({ where: { userId, date: { gte: weekStart } } }),
    prisma.recipe.findMany({
      where: { householdId: identity.membership.householdId, ...visibleTo(identity) },
      include: {
        photos: { take: 1, orderBy: { createdAt: "asc" } },
        cookLogs: { select: { cookedAt: true, rating: true }, orderBy: { cookedAt: "desc" }, take: 50 },
      },
      take: 80,
    }),
    prisma.weeklyReflection.findUnique({ where: { userId_weekStart: { userId, weekStart: currentWeekStart } } }),
  ]);

  const labels = settings?.labels.length ? settings.labels : DEFAULT_LABELS;
  const checklistItems = (checklist?.items as Record<string, boolean> | undefined) ?? {};
  const firstName = identity.user.displayName.trim().split(/\s+/)[0];
  const dateLabel = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const weekLine = workoutCount || weekCheckIns
    ? `${workoutCount} movement${workoutCount === 1 ? " session" : " sessions"} · ${weekCheckIns} check-in${weekCheckIns === 1 ? "" : "s"} this week`
    : "There is no score to catch up on — start with today.";
  const rankedRecipes = recipes
    .map((recipe) => {
      const ratings = recipe.cookLogs.filter((log) => log.rating != null);
      const average = ratings.length ? ratings.reduce((sum, log) => sum + (log.rating ?? 0), 0) / ratings.length : 0;
      const lastCooked = recipe.cookLogs[0]?.cookedAt.getTime() ?? 0;
      return { recipe, average, lastCooked };
    })
    .sort((a, b) => b.average - a.average || a.lastCooked - b.lastCooked || a.recipe.title.localeCompare(b.recipe.title));
  const cookingPick = rankedRecipes.length ? rankedRecipes[now.getDate() % rankedRecipes.length].recipe : null;

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
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>Choose one thing</p><h2>What would feel useful?</h2></div>
        <div className={styles.choiceGrid}>
          <Link href="/decide" className={styles.choiceCard}><span className={styles.choiceIcon}>🍳</span><span><strong>Make something</strong><small>Find a good dinner</small></span><b>→</b></Link>
          <Link href="/health/workouts" className={styles.choiceCard}><span className={styles.choiceIcon}>↗</span><span><strong>Move a little</strong><small>Start a short session</small></span><b>→</b></Link>
          <Link href="/plan" className={styles.choiceCard}><span className={styles.choiceIcon}>☰</span><span><strong>Lighten later</strong><small>Plan a meal or two</small></span><b>→</b></Link>
        </div>
      </section>

      {cookingPick ? (
        <Link href={`/recipes/${cookingPick.id}`} className={`card ${styles.cookingPick}`}>
          {cookingPick.photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoMediaUrl(cookingPick.photos[0])} alt="" className={styles.cookingPhoto} />
          ) : <div className={styles.cookingFallback}>🍽</div>}
          <div className={styles.cookingCopy}>
            <p className={styles.eyebrow}>From your kitchen</p>
            <h2 className={styles.sectionTitle}>{cookingPick.title}</h2>
            <p>{cookingReason(cookingPick)}</p>
          </div>
          <span className={styles.cookingArrow}>→</span>
        </Link>
      ) : (
        <Link href="/recipes/add" className={`card ${styles.noCookingPick}`}>
          <p className={styles.eyebrow}>From your kitchen</p>
          <h2 className={styles.sectionTitle}>Add a recipe you&rsquo;d like to remember</h2>
          <span>Build a useful cooking memory, one dish at a time. →</span>
        </Link>
      )}

      <div className={styles.footerRow}><p className={styles.weekLine}>{weekLine}</p><Link href="/reflection" className={styles.reflectionLink}>Weekly view →</Link></div>
      <p className={styles.privateNote}>Your check-ins stay separate from your shared kitchen.</p>
    </div>
  );
}
