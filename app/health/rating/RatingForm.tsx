"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./rating.module.css";

type Initial = { stuckToPlan: string | null; energyMood: number | null; note: string | null };

export default function RatingForm({ today, initial }: { today: string; initial: Initial }) {
  const router = useRouter();
  const [stuckToPlan, setStuckToPlan] = useState<string | null>(initial.stuckToPlan);
  const [energyMood, setEnergyMood] = useState<number | null>(initial.energyMood);
  const [note, setNote] = useState(initial.note ?? "");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  async function save(next: { stuckToPlan?: string | null; energyMood?: number | null; note?: string }) {
    setSaving(true); setJustSaved(false);
    try {
      const res = await fetch("/api/health/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          stuckToPlan: next.stuckToPlan !== undefined ? next.stuckToPlan : stuckToPlan,
          energyMood: next.energyMood !== undefined ? next.energyMood : energyMood,
          note: next.note !== undefined ? next.note : note,
        }),
      });
      if (!res.ok) throw new Error();
      setJustSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function tapStuck(value: string) {
    setStuckToPlan(value);
    save({ stuckToPlan: value });
  }

  function tapEnergy(value: number) {
    setEnergyMood(value);
    save({ energyMood: value });
  }

  return (
    <section className={`card ${styles.todayCard}`}>
      <h2 className={styles.todayTitle}>Today</h2>

      <div className={styles.section}>
        <span className={styles.sectionLabel}>Stuck to plan?</span>
        <div className={styles.stuckRow}>
          <button
            type="button"
            className={`${styles.stuckBtn} ${styles.stuckYes} ${stuckToPlan === "yes" ? styles.active : ""}`}
            onClick={() => tapStuck("yes")}
          >Yes</button>
          <button
            type="button"
            className={`${styles.stuckBtn} ${styles.stuckPartial} ${stuckToPlan === "partial" ? styles.active : ""}`}
            onClick={() => tapStuck("partial")}
          >Partly</button>
          <button
            type="button"
            className={`${styles.stuckBtn} ${styles.stuckNo} ${stuckToPlan === "no" ? styles.active : ""}`}
            onClick={() => tapStuck("no")}
          >No</button>
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionLabel}>Energy / mood</span>
        <div className={styles.energyRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`${styles.energyBtn} ${energyMood === n ? styles.active : ""}`}
              onClick={() => tapEnergy(n)}
            >{n}</button>
          ))}
        </div>
      </div>

      <div className={styles.noteRow}>
        <span className={styles.sectionLabel}>Note (optional)</span>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything worth remembering" />
        <button type="button" className={`btn btn-secondary ${styles.saveNote}`} disabled={saving} onClick={() => save({ note })}>Save note</button>
      </div>

      {justSaved && !saving && <span className={styles.saved}>Saved</span>}
    </section>
  );
}
