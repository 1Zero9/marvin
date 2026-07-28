"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./alcohol.module.css";

type Initial = { hadDrink: boolean; units: number | null; notes: string | null } | null;

export default function TodayLog({ today, initial }: { today: string; initial: Initial }) {
  const router = useRouter();
  const [hadDrink, setHadDrink] = useState<boolean | null>(initial?.hadDrink ?? null);
  const [units, setUnits] = useState(initial?.units != null ? String(initial.units) : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  async function save(next: { hadDrink: boolean; units?: string; notes?: string }) {
    setSaving(true); setJustSaved(false);
    try {
      const res = await fetch("/api/health/alcohol/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          hadDrink: next.hadDrink,
          units: next.hadDrink && next.units ? Number(next.units) : null,
          notes: next.notes ?? notes,
        }),
      });
      if (!res.ok) throw new Error();
      setJustSaved(true);
      router.refresh();
    } finally { setSaving(false); }
  }

  function tap(value: boolean) {
    setHadDrink(value);
    save({ hadDrink: value, units, notes });
  }

  return (
    <section className={`card ${styles.todayCard}`}>
      <h2 className={styles.todayTitle}>Did you have a drink today?</h2>
      <div className={styles.toggleRow}>
        <button type="button" className={`${styles.toggleBtn} ${hadDrink === false ? styles.toggleBtnActiveNo : ""}`} onClick={() => tap(false)}>No</button>
        <button type="button" className={`${styles.toggleBtn} ${hadDrink === true ? styles.toggleBtnActiveYes : ""}`} onClick={() => tap(true)}>Yes</button>
      </div>
      {hadDrink === true && (
        <div className={styles.detailRow}>
          <label>Units
            <input className="input" type="number" step="0.5" inputMode="decimal" value={units} onChange={(e) => setUnits(e.target.value)} placeholder="e.g. 3" />
          </label>
          <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => save({ hadDrink: true, units, notes })}>Save units</button>
        </div>
      )}
      {hadDrink !== null && (
        <div className={styles.noteRow}>
          <label>Note (optional)
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering" />
          </label>
          <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => save({ hadDrink, units, notes })}>Save note</button>
        </div>
      )}
      {justSaved && !saving && <span className={styles.saved}>Saved</span>}
    </section>
  );
}
