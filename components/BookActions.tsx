"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./BookActions.module.css";

export default function BookActions({
  bookId,
  favourite,
  archived,
}: {
  bookId: string;
  favourite: boolean;
  archived: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(data: { favourite?: boolean; archived?: boolean }) {
    setBusy(true);
    try {
      await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      !confirm(
        "Delete this book and all its index entries? This can't be undone."
      )
    )
      return;
    setBusy(true);
    try {
      await fetch(`/api/books/${bookId}`, { method: "DELETE" });
      router.push("/books");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.actions}>
      <button
        className={`${styles.favBtn} ${favourite ? styles.favOn : ""}`}
        onClick={() => patch({ favourite: !favourite })}
        disabled={busy}
        aria-pressed={favourite}
      >
        {favourite ? "♥ Favourite" : "♡ Favourite"}
      </button>
      <button
        className="btn btn-secondary"
        onClick={() => patch({ archived: !archived })}
        disabled={busy}
      >
        {archived ? "Unarchive" : "Archive"}
      </button>
      <button className={styles.deleteBtn} onClick={remove} disabled={busy}>
        Delete
      </button>
    </div>
  );
}
