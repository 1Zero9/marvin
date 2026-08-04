"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./AddToShoppingList.module.css";

export default function AddToShoppingList({ recipeId }: { recipeId: string }) {
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function add() {
    setWorking(true);
    setMessage(null);
    try {
      const res = await fetch("/api/shopping/add-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Couldn’t add to your shopping list.");
      setMessage(
        data.added > 0
          ? `Added ${data.added} item${data.added === 1 ? "" : "s"} to your shopping list.`
          : "Those ingredients are already on your list."
      );
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Couldn’t add to your shopping list.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <button type="button" className="btn btn-secondary" disabled={working} onClick={add}>
        {working ? "Adding…" : "Add to shopping list"}
      </button>
      {message && (
        <p className={styles.message} role="status">
          {message} <Link href="/shopping">View list →</Link>
        </p>
      )}
    </div>
  );
}
