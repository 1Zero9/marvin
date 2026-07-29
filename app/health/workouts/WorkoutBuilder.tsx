"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./workouts.module.css";

export type ExerciseLite = {
  id: string;
  name: string;
  category: string;
  cue: string;
  whySafeNote: string | null;
  beginnerVariant: string | null;
  progressedVariant: string | null;
  physioPrescribed: boolean;
  reps: string | null;
  sets: number | null;
  holdSeconds: number | null;
  frequencyPerDay: number | null;
  source: string | null;
};

const CATEGORY_ORDER = ["strength", "core", "mobility", "low-impact-cardio", "chest", "back-rehab", "ankle-rehab"];
const CATEGORY_LABELS: Record<string, string> = {
  strength: "Strength",
  core: "Core",
  mobility: "Mobility",
  "low-impact-cardio": "Low-impact cardio",
  chest: "Chest",
  "back-rehab": "Back rehab · physio-prescribed",
  "ankle-rehab": "Ankle rehab · physio-prescribed",
};

function rx(ex: ExerciseLite) {
  const parts: string[] = [];
  if (ex.sets) parts.push(`${ex.sets} sets`);
  if (ex.reps) parts.push(`${ex.reps} reps`);
  if (ex.holdSeconds) parts.push(`hold ${ex.holdSeconds >= 60 ? `${Math.round(ex.holdSeconds / 60)} min` : `${ex.holdSeconds} sec`}`);
  if (ex.frequencyPerDay) parts.push(`${ex.frequencyPerDay}x/day`);
  return parts.join(" · ");
}

export default function WorkoutBuilder({
  today,
  exercises,
  suggestionIds,
}: {
  today: string;
  exercises: ExerciseLite[];
  suggestionIds: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState("12");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byCategory = new Map<string, ExerciseLite[]>();
  for (const ex of exercises) {
    if (!byCategory.has(ex.category)) byCategory.set(ex.category, []);
    byCategory.get(ex.category)!.push(ex);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function useSuggestion() {
    setSelected(new Set(suggestionIds));
  }

  async function logSession() {
    if (selected.size === 0) { setError("Pick at least one exercise"); return; }
    const mins = Number(duration);
    if (!Number.isFinite(mins) || mins <= 0) { setError("Enter a valid duration"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/health/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, exerciseIds: Array.from(selected), durationMin: mins, notes }),
      });
      if (!res.ok) throw new Error();
      setSelected(new Set());
      setNotes("");
      router.refresh();
    } catch {
      setError("Couldn't log that session. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={`card ${styles.builderCard}`}>
      <div className={styles.builderTitle}>
        <h2>Build a session</h2>
        <span className={styles.selectedCount}>{selected.size} selected</span>
      </div>

      {CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((category) => (
        <div key={category} className={styles.categoryGroup}>
          <span className={`${styles.categoryLabel} ${category.endsWith("-rehab") ? styles.rehabLabel : ""}`}>
            {CATEGORY_LABELS[category] ?? category}
          </span>
          {byCategory.get(category)!.map((ex) => {
            const isRehab = ex.category.endsWith("-rehab");
            const isSelected = selected.has(ex.id);
            return (
              <label
                key={ex.id}
                className={`${styles.exerciseRow} ${isSelected ? styles.exerciseRowSelected : ""} ${isRehab ? styles.rehabRow : ""}`}
              >
                <input type="checkbox" className={styles.exerciseCheck} checked={isSelected} onChange={() => toggle(ex.id)} />
                <div className={styles.exerciseBody}>
                  <div className={styles.exerciseTop}>
                    <span className={styles.exerciseName}>{ex.name}</span>
                    {ex.physioPrescribed && <span className={styles.physioBadge}>Physio</span>}
                  </div>
                  <span className={styles.exerciseCue}>{ex.cue}</span>
                  {ex.whySafeNote && <span className={styles.exerciseSafe}>{ex.whySafeNote}</span>}
                  {rx(ex) && <span className={styles.exerciseRx}>{rx(ex)}</span>}
                  {(ex.beginnerVariant || ex.progressedVariant) && (
                    <span className={styles.exerciseVariants}>
                      {ex.beginnerVariant && <>Easier: {ex.beginnerVariant} </>}
                      {ex.progressedVariant && <>More: {ex.progressedVariant}</>}
                    </span>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      ))}

      {error && <p className={styles.error}>{error}</p>}
      <div className={`${styles.form} ${styles.formRow}`}>
        <label>Duration (min)
          <input className="input" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </label>
        <label>Notes (optional)
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it feel?" />
        </label>
      </div>
      <div className={styles.formRow}>
        <button type="button" className="btn btn-secondary" onClick={useSuggestion}>Use today's suggestion</button>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={logSession}>Log session</button>
      </div>
    </section>
  );
}

export function DeleteSessionButton({ id }: { id: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/health/workouts/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button type="button" className={styles.deleteBtn} disabled={deleting} onClick={onDelete}>
      Delete
    </button>
  );
}
