"use client";

import { useState } from "react";
import styles from "./RecipeShare.module.css";

export default function RecipeShare({
  recipeId,
  initialUrl,
  canShare,
}: {
  recipeId: string;
  initialUrl: string | null;
  canShare: boolean;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!canShare) return null;

  async function enable() {
    setWorking(true); setMessage(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/share`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || typeof data.url !== "string") throw new Error(data.error);
      setUrl(data.url);
      await navigator.clipboard?.writeText(data.url);
      setMessage("Share link copied.");
    } catch {
      setMessage("Couldn’t create the link. Try again.");
    } finally { setWorking(false); }
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard?.writeText(new URL(url, window.location.origin).toString());
      setMessage("Share link copied.");
    } catch { setMessage("Copy the link from the address bar."); }
  }

  async function revoke() {
    setWorking(true); setMessage(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/share`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setUrl(null);
      setMessage("Sharing stopped. The old link no longer works.");
    } catch {
      setMessage("Couldn’t stop sharing. Try again.");
    } finally { setWorking(false); }
  }

  return (
    <section className={`card ${styles.card}`}>
      <div>
        <h2 className={styles.title}>Share this recipe</h2>
        <p className={styles.copy}>Only this recipe&rsquo;s ingredients, method, recipe photos, and links are shared — never cook logs, household details, or health data.</p>
      </div>
      <div className={styles.actions}>
        {url ? (
          <>
            <button type="button" className="btn btn-secondary" onClick={copy} disabled={working}>Copy link</button>
            <button type="button" className={styles.stopButton} onClick={revoke} disabled={working}>Stop sharing</button>
          </>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={enable} disabled={working}>Create share link</button>
        )}
      </div>
      {message && <p className={styles.message} role="status">{message}</p>}
    </section>
  );
}
