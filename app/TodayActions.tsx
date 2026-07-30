"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./today.module.css";

type CheckIn = {
  intention: string | null;
  waterGlasses: number;
  reflection: string | null;
};

type Rating = {
  stuckToPlan: string | null;
  energyMood: number | null;
};

export default function TodayActions({
  today,
  checkIn,
  rating,
  labels,
  initialChecklist,
}: {
  today: string;
  checkIn: CheckIn;
  rating: Rating;
  labels: string[];
  initialChecklist: Record<string, boolean>;
}) {
  const router = useRouter();
  const [waterGlasses, setWaterGlasses] = useState(checkIn.waterGlasses);
  const [intention, setIntention] = useState(checkIn.intention ?? "");
  const [reflection, setReflection] = useState(checkIn.reflection ?? "");
  const [items, setItems] = useState(initialChecklist);
  const [stuckToPlan, setStuckToPlan] = useState(rating.stuckToPlan);
  const [energyMood, setEnergyMood] = useState(rating.energyMood);
  const [saving, setSaving] = useState<"water" | "intention" | "reflection" | "checklist" | "rating" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveToday(
    patch: Partial<Pick<CheckIn, "waterGlasses" | "intention" | "reflection">>,
    kind: "water" | "intention" | "reflection"
  ) {
    setSaving(kind);
    setError(null);
    try {
      const res = await fetch("/api/today", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, ...patch }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("Couldn’t save that. Try again.");
    } finally {
      setSaving(null);
    }
  }

  function changeWater(next: number) {
    const bounded = Math.max(0, Math.min(20, next));
    setWaterGlasses(bounded);
    saveToday({ waterGlasses: bounded }, "water");
  }

  async function toggleChecklist(label: string) {
    const next = { ...items, [label]: !items[label] };
    setItems(next);
    setSaving("checklist");
    setError(null);
    try {
      const res = await fetch("/api/health/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, items: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setItems(items);
      setError("Couldn’t save that. Try again.");
    } finally {
      setSaving(null);
    }
  }

  function submit(kind: "intention" | "reflection", event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveToday({ [kind]: kind === "intention" ? intention : reflection }, kind);
  }

  async function saveRating(patch: Partial<Rating>) {
    setSaving("rating");
    setError(null);
    try {
      const res = await fetch("/api/health/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          stuckToPlan: patch.stuckToPlan !== undefined ? patch.stuckToPlan : stuckToPlan,
          energyMood: patch.energyMood !== undefined ? patch.energyMood : energyMood,
        }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("Couldn’t save that. Try again.");
    } finally {
      setSaving(null);
    }
  }

  function ratePlan(value: string) {
    setStuckToPlan(value);
    saveRating({ stuckToPlan: value });
  }

  function rateEnergy(value: number) {
    setEnergyMood(value);
    saveRating({ energyMood: value });
  }

  return (
    <div className={styles.actionStack}>
      <section className={`card ${styles.intentionCard}`}>
        <p className={styles.eyebrow}>A gentle direction</p>
        <h2 className={styles.sectionTitle}>What would make today feel good?</h2>
        <form className={styles.inlineForm} onSubmit={(event) => submit("intention", event)}>
          <input
            className="input"
            value={intention}
            maxLength={160}
            onChange={(event) => setIntention(event.target.value)}
            placeholder="One realistic thing — e.g. cook at home tonight"
            aria-label="Today’s intention"
          />
          <button className="btn btn-primary" disabled={saving === "intention"}>
            Save
          </button>
        </form>
      </section>

      <section className={`card ${styles.waterCard}`}>
        <div>
          <p className={styles.eyebrow}>A small win</p>
          <h2 className={styles.sectionTitle}>Water</h2>
          <p className={styles.waterHint}>A simple count, not a target to be perfect about.</p>
        </div>
        <div className={styles.waterControl} aria-label={`${waterGlasses} glasses of water logged`}>
          <button type="button" className={styles.waterButton} onClick={() => changeWater(waterGlasses - 1)} disabled={saving === "water" || waterGlasses === 0} aria-label="Remove a glass of water">−</button>
          <strong className={styles.waterValue}>{waterGlasses}</strong>
          <span className={styles.waterUnit}>glasses</span>
          <button type="button" className={styles.waterButton} onClick={() => changeWater(waterGlasses + 1)} disabled={saving === "water" || waterGlasses === 20} aria-label="Add a glass of water">+</button>
        </div>
      </section>

      <section className={`card ${styles.checklistCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Keep it honest</p>
            <h2 className={styles.sectionTitle}>Your non-negotiables</h2>
          </div>
          <span className={styles.doneCount}>{Object.values(items).filter(Boolean).length}/{labels.length}</span>
        </div>
        <div className={styles.checklist}>
          {labels.map((label) => (
            <label key={label} className={styles.checkRow}>
              <input type="checkbox" checked={!!items[label]} disabled={saving === "checklist"} onChange={() => toggleChecklist(label)} />
              <span className={items[label] ? styles.done : ""}>{label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className={`card ${styles.checkInCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>A quick check-in</p>
            <h2 className={styles.sectionTitle}>How are you feeling?</h2>
          </div>
          <a href="/health/rating" className={styles.ratingHistory}>History →</a>
        </div>
        <div className={styles.ratingSection}>
          <span>How did your plan go?</span>
          <div className={styles.planRatingButtons}>
            {[{ value: "yes", label: "Good" }, { value: "partial", label: "Partly" }, { value: "no", label: "Not today" }].map((option) => (
              <button key={option.value} type="button" className={`${styles.planRatingButton} ${stuckToPlan === option.value ? styles.ratingActive : ""}`} disabled={saving === "rating"} onClick={() => ratePlan(option.value)}>{option.label}</button>
            ))}
          </div>
        </div>
        <div className={styles.ratingSection}>
          <span>Energy / mood</span>
          <div className={styles.energyButtons}>
            {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" className={`${styles.energyButton} ${energyMood === value ? styles.ratingActive : ""}`} disabled={saving === "rating"} onClick={() => rateEnergy(value)} aria-label={`Energy or mood ${value} out of 5`}>{value}</button>)}
          </div>
        </div>
        <details className={styles.reflectionDetails} open={Boolean(reflection)}>
          <summary>
            <span>
              <strong>Leave a note</strong>
              <small>Optional — a place to be honest with yourself.</small>
            </span>
            <span aria-hidden="true">+</span>
          </summary>
          <form className={styles.reflectionForm} onSubmit={(event) => submit("reflection", event)}>
            <textarea
              className="input"
              value={reflection}
              maxLength={500}
              onChange={(event) => setReflection(event.target.value)}
              placeholder="What helped, what got in the way, or just how it felt."
              aria-label="Today’s reflection"
            />
            <button className="btn btn-secondary" disabled={saving === "reflection"}>Save note</button>
          </form>
        </details>
      </section>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
