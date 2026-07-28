"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./alcohol.module.css";

type Phase = {
  id: string;
  type: "zero" | "moderate";
  startDate: string;
  endDate: string | null;
  weeklyUnitTarget: number | null;
};

export default function PhaseActions({
  today,
  activePhase,
  isZeroComplete,
  dayNumber,
  daysRemaining,
  weekUnits,
}: {
  today: string;
  activePhase: Phase | null;
  isZeroComplete: boolean;
  dayNumber: number | null;
  daysRemaining: number | null;
  weekUnits: number | null;
}) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(today);
  const [weeklyTarget, setWeeklyTarget] = useState(String(activePhase?.weeklyUnitTarget ?? 11));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTarget, setEditingTarget] = useState(false);

  async function startPhase(type: "zero" | "moderate", date: string, target?: string) {
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/health/alcohol/phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, startDate: date, weeklyUnitTarget: target ? Number(target) : undefined }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch { setError("Couldn't start that phase. Try again."); }
    finally { setSaving(false); }
  }

  async function saveTarget() {
    if (!activePhase) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/health/alcohol/phase/${activePhase.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyUnitTarget: Number(weeklyTarget) }),
      });
      if (!res.ok) throw new Error();
      setEditingTarget(false);
      router.refresh();
    } catch { setError("Couldn't save that target."); }
    finally { setSaving(false); }
  }

  if (!activePhase) {
    return (
      <section className={`card ${styles.phaseCard}`}>
        <h2 className={styles.phaseTitle}>No phase running</h2>
        <p className={styles.phaseProgress}>Start a 30-day zero period whenever you're ready — pick a start date, even a future one.</p>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.startForm}>
          <div className={styles.startFormRow}>
            <label>Start date<input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => startPhase("zero", startDate)}>Start 30-day zero period</button>
          </div>
        </div>
      </section>
    );
  }

  if (activePhase.type === "zero" && !isZeroComplete) {
    return (
      <section className={`card ${styles.phaseCard}`}>
        <span className={styles.phaseType}>Zero period</span>
        <p className={styles.phaseProgress}>Day {dayNumber} of 30 · {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining</p>
      </section>
    );
  }

  if (activePhase.type === "zero" && isZeroComplete) {
    return (
      <section className={`card ${styles.phaseCard}`}>
        <div className={styles.banner}>
          <span className={styles.bannerTitle}>Your 30-day zero period is complete 🎉</span>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.startFormRow}>
            <label>Weekly unit target<input className="input" type="number" value={weeklyTarget} onChange={(e) => setWeeklyTarget(e.target.value)} style={{ width: 80 }} /></label>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => startPhase("moderate", today, weeklyTarget)}>Start moderate phase</button>
          </div>
          <div className={styles.startFormRow}>
            <label>Or start another zero period<input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
            <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => startPhase("zero", startDate)}>Start zero period</button>
          </div>
        </div>
      </section>
    );
  }

  // moderate, ongoing
  const target = activePhase.weeklyUnitTarget ?? 0;
  const units = weekUnits ?? 0;
  const over = units > target;

  return (
    <section className={`card ${styles.phaseCard}`}>
      <span className={styles.phaseType}>Moderate phase</span>
      <div className={styles.weekProgress}>
        <span className={`${styles.weekNumber} ${over ? styles.weekOver : styles.weekUnder}`}>{units}</span>
        <span className={styles.phaseProgress}>/ {target} units this week</span>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {editingTarget ? (
        <div className={styles.targetEdit}>
          <input className="input" type="number" value={weeklyTarget} onChange={(e) => setWeeklyTarget(e.target.value)} />
          <button type="button" className="btn btn-secondary" disabled={saving} onClick={saveTarget}>Save</button>
        </div>
      ) : (
        <button type="button" className={styles.targetEdit} onClick={() => setEditingTarget(true)}>Edit weekly target</button>
      )}
      <div className={styles.startFormRow}>
        <label>Start a new zero period<input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
        <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => startPhase("zero", startDate)}>Start</button>
      </div>
    </section>
  );
}
