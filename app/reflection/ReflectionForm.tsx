"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./reflection.module.css";

type Reflection = { win: string | null; lesson: string | null; experiment: string | null };

export default function ReflectionForm({ weekStart, initial }: { weekStart: string; initial: Reflection }) {
  const router = useRouter();
  const [win, setWin] = useState(initial.win ?? "");
  const [lesson, setLesson] = useState(initial.lesson ?? "");
  const [experiment, setExperiment] = useState(initial.experiment ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setMessage(null);
    try {
      const res = await fetch("/api/reflection", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart, win, lesson, experiment }),
      });
      if (!res.ok) throw new Error();
      setMessage("Your reflection is saved.");
      router.refresh();
    } catch {
      setMessage("Couldn’t save that. Try again.");
    } finally { setSaving(false); }
  }

  return (
    <form className={`card ${styles.form}`} onSubmit={save}>
      <div>
        <p className={styles.eyebrow}>Your words matter most</p>
        <h2>Close the week honestly</h2>
      </div>
      <label>
        <span>One thing that went well</span>
        <textarea className="input" maxLength={300} value={win} onChange={(event) => setWin(event.target.value)} placeholder="A small win absolutely counts." />
      </label>
      <label>
        <span>What got in the way, or what did you learn?</span>
        <textarea className="input" maxLength={400} value={lesson} onChange={(event) => setLesson(event.target.value)} placeholder="No blame — just something useful for next time." />
      </label>
      <label>
        <span>One experiment for next week</span>
        <input className="input" maxLength={200} value={experiment} onChange={(event) => setExperiment(event.target.value)} placeholder="e.g. decide dinner before leaving work" />
      </label>
      <div className={styles.actions}>
        <button className="btn btn-primary" disabled={saving}>Save reflection</button>
        {message && <span className={styles.message} role="status">{message}</span>}
      </div>
    </form>
  );
}
