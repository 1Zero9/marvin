import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";
import { toDateInput } from "@/lib/dates";
import WorkoutBuilder, { DeleteSessionButton } from "./WorkoutBuilder";
import styles from "./workouts.module.css";

export const dynamic = "force-dynamic";

const GENERAL_CATEGORIES = ["strength", "core", "mobility", "low-impact-cardio", "chest"];

function dayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

export default async function WorkoutsPage() {
  const identity = await requireHousehold();
  const userId = identity.user.id;
  const today = new Date();

  const [exercises, sessions] = await Promise.all([
    prisma.exercise.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] }),
    prisma.workoutSession.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 15 }),
  ]);

  const exerciseById = new Map(exercises.map((ex) => [ex.id, ex]));

  const seed = dayOfYear(today);
  const suggestionIds: string[] = [];
  for (let i = 0; i < GENERAL_CATEGORIES.length; i++) {
    const inCategory = exercises.filter((ex) => ex.category === GENERAL_CATEGORIES[i]);
    if (inCategory.length === 0) continue;
    const pick = inCategory[(seed + i) % inCategory.length];
    suggestionIds.push(pick.id);
  }
  const suggestionNames = suggestionIds.map((id) => exerciseById.get(id)?.name).filter(Boolean) as string[];

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>Workouts</h1>
        <Link href="/health" className={styles.back}>← Health</Link>
      </div>

      <section className={`card ${styles.suggestionCard}`}>
        <h2>Today's suggestion</h2>
        <p>A quick 10-15 min mix, ankle and back-safe. Tap below to load it into the builder, or pick your own.</p>
        <div className={styles.suggestionList}>
          {suggestionNames.map((name) => (
            <span key={name} className={styles.suggestionTag}>{name}</span>
          ))}
        </div>
      </section>

      <WorkoutBuilder
        today={toDateInput(today)}
        suggestionIds={suggestionIds}
        exercises={exercises.map((ex) => ({
          id: ex.id,
          name: ex.name,
          category: ex.category,
          cue: ex.cue,
          whySafeNote: ex.whySafeNote,
          beginnerVariant: ex.beginnerVariant,
          progressedVariant: ex.progressedVariant,
          physioPrescribed: ex.physioPrescribed,
          reps: ex.reps,
          sets: ex.sets,
          holdSeconds: ex.holdSeconds,
          frequencyPerDay: ex.frequencyPerDay,
          source: ex.source,
        }))}
      />

      <section className={`card ${styles.list}`}>
        <h2 className={styles.listTitle}>History</h2>
        {sessions.length === 0 ? (
          <p className={styles.empty}>No sessions logged yet.</p>
        ) : (
          sessions.map((session) => {
            const names = session.exerciseIds.map((id) => exerciseById.get(id)?.name).filter(Boolean) as string[];
            return (
              <div key={session.id} className={styles.entry}>
                <div className={styles.entryLeft}>
                  <div className={styles.entryTop}>
                    <span className={styles.entryDate}>
                      {new Date(session.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span className={styles.entryDuration}>{session.durationMin} min</span>
                  </div>
                  <div className={styles.entryTags}>
                    {names.map((name) => (
                      <span key={name} className={styles.entryTag}>{name}</span>
                    ))}
                  </div>
                  {session.notes && <span className={styles.entryNotes}>{session.notes}</span>}
                </div>
                <DeleteSessionButton id={session.id} />
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
