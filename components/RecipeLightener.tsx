"use client";

import { useState } from "react";
import styles from "./RecipeLightener.module.css";

type Swap = { original: string; swap: string; reason: string; impactLevel: "low" | "medium" | "high" };

function swapsFrom(value: unknown): Swap[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const swap = item as Partial<Swap>;
    return typeof swap.original === "string" && typeof swap.swap === "string" && typeof swap.reason === "string" && (swap.impactLevel === "low" || swap.impactLevel === "medium" || swap.impactLevel === "high") ? [swap as Swap] : [];
  });
}

export default function RecipeLightener({
  recipeId,
  initialSuggestions,
  initialVariant,
}: {
  recipeId: string;
  initialSuggestions: unknown;
  initialVariant: boolean;
}) {
  const [suggestions, setSuggestions] = useState<Swap[]>(() => swapsFrom(initialSuggestions));
  const [saved, setSaved] = useState(initialVariant);
  const [working, setWorking] = useState<"ideas" | "save" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function findIdeas() {
    setWorking("ideas");
    setMessage(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/lighten`, { method: "POST" });
      const data = await res.json();
      const next = swapsFrom(data?.suggestions);
      if (!res.ok || next.length === 0) throw new Error(data?.error || "Couldn’t find lighter options.");
      setSuggestions(next);
      setSaved(false);
      setMessage("Fresh options are ready. Keep only what feels useful.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Couldn’t find lighter options.");
    } finally {
      setWorking(null);
    }
  }

  async function saveVariant() {
    setWorking("save");
    setMessage(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/lighten/variant`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn’t save your lighter version.");
      setSaved(true);
      setMessage("Saved as your private lighter version.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Couldn’t save your lighter version.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <section className={`card ${styles.card}`}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>For you</p>
          <h2 className={styles.title}>Lighten this meal</h2>
        </div>
        <span className={styles.private}>🔒 Private</span>
      </div>
      <p className={styles.copy}>Find optional ingredient and method swaps—without turning this into a diet score. Marvin sends this recipe&rsquo;s ingredients and method to Gemini to make the suggestions; it never sends your health check-ins or history.</p>
      {suggestions.length > 0 && (
        <ul className={styles.list}>
          {suggestions.map((suggestion, index) => (
            <li className={styles.swap} key={`${suggestion.original}-${suggestion.swap}-${index}`}>
              <span className={`${styles.impact} ${styles[`impact${suggestion.impactLevel}`]}`}>{suggestion.impactLevel} change</span>
              <p><strong>{suggestion.original}</strong> → <strong>{suggestion.swap}</strong></p>
              <p className={styles.reason}>{suggestion.reason}</p>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.actions}>
        <button type="button" className="btn btn-secondary" disabled={working !== null} onClick={findIdeas}>{working === "ideas" ? "Thinking…" : suggestions.length ? "Refresh options" : "Find lighter options"}</button>
        {suggestions.length > 0 && <button type="button" className="btn btn-primary" disabled={working !== null || saved} onClick={saveVariant}>{working === "save" ? "Saving…" : saved ? "Saved privately" : "Save my version"}</button>}
      </div>
      {message && <p className={styles.message} role="status">{message}</p>}
    </section>
  );
}
