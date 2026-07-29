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

  const [checkIn, settings, checklist, rating, alcoholLog, workoutCount, weekCheckIns, recipes, weeklyReflection] = await Promise.all([
    prisma.dailyCompanion.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.checklistSettings.findUnique({ where: { userId } }),
    prisma.dailyChecklist.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.dailyRating.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.alcoholLog.findUnique({ where: { userId_date: { userId, date: today } } }),
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
  const weekLine = [
    workoutCount ? `${workoutCount} workout${workoutCount === 1 ? "" : "s"} this week` : "No workout logged yet this week",
    weekCheckIns ? `${weekCheckIns} daily check-in${weekCheckIns === 1 ? "" : "s"}` : "Start with one small check-in",
  ].join(" · ");
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
        <p className={styles.date}>{dateLabel}</p>
        <h1>{greetingFor(now)}, {firstName}</h1>
        <p className={styles.intro}>One honest day at a time. You don&rsquo;t need to do everything; just notice what helps.</p>
      </header>

      <TodayActions
        today={toDateInput(today)}
        checkIn={{ intention: checkIn?.intention ?? null, waterGlasses: checkIn?.waterGlasses ?? 0, reflection: checkIn?.reflection ?? null }}
        rating={{ stuckToPlan: rating?.stuckToPlan ?? null, energyMood: rating?.energyMood ?? null }}
        labels={labels}
        initialChecklist={checklistItems}
      />

      {weeklyReflection?.experiment && (
        <Link href="/reflection" className={`card ${styles.experimentCard}`}>
          <div>
            <p className={styles.eyebrow}>This week&rsquo;s experiment</p>
            <h2 className={styles.sectionTitle}>{weeklyReflection.experiment}</h2>
          </div>
          <span>→</span>
        </Link>
      )}

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

      <section className={`card ${styles.nextCard}`}>
        <div>
          <p className={styles.eyebrow}>Make the next choice easier</p>
          <h2 className={styles.sectionTitle}>What would help right now?</h2>
        </div>
        <div className={styles.nextLinks}>
          <Link href="/decide" className={styles.nextLink}>Find something to cook <span>→</span></Link>
          <Link href="/plan" className={styles.nextLink}>Plan a few meals <span>→</span></Link>
          <Link href="/health/workouts" className={styles.nextLink}>Do a short workout <span>→</span></Link>
          <Link href="/health/alcohol" className={styles.nextLink}>
            {alcoholLog ? "Review today’s alcohol log" : "Check in on alcohol"} <span>→</span>
          </Link>
        </div>
      </section>

      <p className={styles.weekLine}>{weekLine}</p>
      <Link href="/reflection" className={styles.reflectionLink}>See your weekly reflection →</Link>
      <p className={styles.privateNote}>Your daily check-in is private to you. It is never part of your household cooking library.</p>
    </div>
  );
}
