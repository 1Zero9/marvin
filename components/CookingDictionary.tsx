"use client";

import { useMemo, useState } from "react";
import { cookingDictionary } from "@/lib/cookingDictionary";
import styles from "./CookingDictionary.module.css";

export default function CookingDictionary() {
  const [query, setQuery] = useState("");
  const terms = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return cookingDictionary;
    return cookingDictionary.filter((item) => `${item.term} ${item.definition} ${item.whyItMatters}`.toLowerCase().includes(needle));
  }, [query]);

  return <>
    <label className={styles.search}><span className={styles.searchLabel}>Find a cooking term</span><input className="input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “roux”, “simmer” or “sauce”" autoComplete="off" /></label>
    <section className={styles.terms} aria-live="polite">
      {terms.map((item) => <article key={item.term} className={`card ${styles.term}`}><div><h2>{item.term}</h2>{item.pronunciation && <p className={styles.pronunciation}>{item.pronunciation}</p>}</div><p>{item.definition}</p><p className={styles.why}><strong>Why it matters:</strong> {item.whyItMatters}</p></article>)}
      {terms.length === 0 && <div className={`card ${styles.empty}`}><h2>No match yet</h2><p>Try a different word, or use the wording from the recipe.</p></div>}
    </section>
  </>;
}
