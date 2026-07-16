"use client";

import { useState } from "react";
import styles from "./MealRatingActions.module.css";

export default function MealRatingActions({ logId, initialRating, initialNotes }: { logId: string; initialRating?: number; initialNotes?: string }) {
  const [rating, setRating] = useState(initialRating ?? 0);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  async function save() {
    if (!rating) return;
    setState("saving");
    const res = await fetch(`/api/logs/${logId}/rating`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, notes }) });
    setState(res.ok ? "saved" : "error");
  }
  return <div className={styles.wrap}>
    <span className={styles.label}>Your experience</span>
    <div className={styles.stars}>{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value} stars`} aria-pressed={rating === value} onClick={() => { setRating(value); setState("idle"); }} className={styles.star}>{value <= rating ? "★" : "☆"}</button>)}</div>
    <textarea className={`input ${styles.notes}`} value={notes} onChange={(event) => { setNotes(event.target.value); setState("idle"); }} rows={2} placeholder="What did you think?" />
    <button type="button" className="btn btn-secondary" onClick={save} disabled={!rating || state === "saving"}>{state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Save your rating"}</button>
    {state === "error" && <span className={styles.error}>Couldn&rsquo;t save your rating.</span>}
  </div>;
}
