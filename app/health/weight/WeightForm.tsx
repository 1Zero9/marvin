"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./weight.module.css";

export function AddWeightForm() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [weightKg, setWeightKg] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const value = Number(weightKg);
    if (!Number.isFinite(value) || value <= 0) { setError("Enter your weight in kg"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/health/weight", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, weightKg: value, notes }) });
      if (!res.ok) throw new Error();
      setWeightKg(""); setNotes("");
      router.refresh();
    } catch { setError("Couldn't save that entry. Try again."); }
    finally { setSaving(false); }
  }

  return (
    <section className={`card ${styles.form}`}>
      <h2 className={styles.formTitle}>Add an entry</h2>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.formRow}>
        <label>Date<input className="input" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label>Weight (kg)<input className="input" type="number" step="0.1" inputMode="decimal" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="e.g. 94.5" /></label>
      </div>
      <label>Notes (optional)<input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering" /></label>
      <button className="btn btn-primary" type="button" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save entry"}</button>
    </section>
  );
}

export function DeleteEntryButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    try {
      await fetch(`/api/health/weight/${id}`, { method: "DELETE" });
      router.refresh();
    } finally { setBusy(false); }
  }
  return <button type="button" className={styles.deleteBtn} disabled={busy} onClick={remove} aria-label="Delete entry">✕</button>;
}

export function GoalForm({ targetWeightKg, heightCm }: { targetWeightKg: number | null; heightCm: number | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(!targetWeightKg);
  const [target, setTarget] = useState(targetWeightKg ? String(targetWeightKg) : "");
  const [height, setHeight] = useState(heightCm ? String(heightCm) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const targetValue = Number(target);
    const heightValue = Number(height);
    if (!Number.isFinite(targetValue) || targetValue <= 0) { setError("Enter a target weight in kg"); return; }
    if (!Number.isFinite(heightValue) || heightValue <= 0) { setError("Enter your height in cm"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/health/goal", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetWeightKg: targetValue, heightCm: heightValue }) });
      if (!res.ok) throw new Error();
      setOpen(false);
      router.refresh();
    } catch { setError("Couldn't save your goal. Try again."); }
    finally { setSaving(false); }
  }

  if (!open) {
    return <button type="button" className={styles.editGoal} onClick={() => setOpen(true)}>Edit goal</button>;
  }

  return (
    <div className={styles.goalForm}>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.formRow}>
        <label>Target weight (kg)<input className="input" type="number" step="0.1" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. 78" /></label>
        <label>Height (cm)<input className="input" type="number" step="0.5" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 178" /></label>
      </div>
      <div className={styles.goalActions}>
        <button className="btn btn-primary" type="button" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save goal"}</button>
        {targetWeightKg != null && <button className="btn btn-secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>}
      </div>
    </div>
  );
}
