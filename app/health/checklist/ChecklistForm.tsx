"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./checklist.module.css";

export function TodayChecklist({
  today,
  labels,
  initialItems,
}: {
  today: string;
  labels: string[];
  initialItems: Record<string, boolean>;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Record<string, boolean>>(initialItems);
  const [saving, setSaving] = useState(false);

  async function toggle(label: string) {
    const next = { ...items, [label]: !items[label] };
    setItems(next);
    setSaving(true);
    try {
      const res = await fetch("/api/health/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, items: next }),
      });
      if (res.ok) router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={`card ${styles.todayCard}`}>
      <h2 className={styles.todayTitle}>Today</h2>
      {labels.map((label) => (
        <label key={label} className={styles.itemRow}>
          <input
            type="checkbox"
            className={styles.itemCheck}
            checked={!!items[label]}
            disabled={saving}
            onChange={() => toggle(label)}
          />
          <span className={`${styles.itemLabel} ${items[label] ? styles.itemLabelDone : ""}`}>{label}</span>
        </label>
      ))}
    </section>
  );
}

export function ChecklistSettingsForm({ labels }: { labels: string[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(labels.length ? labels : [""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateAt(i: number, value: string) {
    setDraft((prev) => prev.map((l, idx) => (idx === i ? value : l)));
  }
  function removeAt(i: number) {
    setDraft((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addRow() {
    if (draft.length >= 4) return;
    setDraft((prev) => [...prev, ""]);
  }

  async function save() {
    const cleaned = draft.map((l) => l.trim()).filter(Boolean);
    if (cleaned.length === 0) { setError("Add at least one item"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/health/checklist/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labels: cleaned }),
      });
      if (!res.ok) throw new Error();
      setEditing(false);
      router.refresh();
    } catch {
      setError("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button type="button" className={styles.editLink} onClick={() => { setDraft(labels.length ? labels : [""]); setEditing(true); }}>
        Edit your list
      </button>
    );
  }

  return (
    <div className={`card ${styles.settingsForm}`}>
      <span className={styles.todayTitle}>Your non-negotiables (up to 4)</span>
      {error && <p className={styles.error}>{error}</p>}
      {draft.map((label, i) => (
        <div key={i} className={styles.settingsRow}>
          <input className="input" value={label} onChange={(e) => updateAt(i, e.target.value)} placeholder="e.g. Short walk" />
          <button type="button" className={styles.removeBtn} onClick={() => removeAt(i)}>✕</button>
        </div>
      ))}
      <div className={styles.settingsActions}>
        {draft.length < 4 && (
          <button type="button" className="btn btn-secondary" onClick={addRow}>Add item</button>
        )}
        <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>Save</button>
        <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </div>
  );
}
