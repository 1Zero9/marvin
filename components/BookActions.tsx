"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./BookActions.module.css";

export default function BookActions({
  bookId,
  title,
  favourite,
  archived,
  visibility,
}: {
  bookId: string;
  title: string;
  favourite: boolean;
  archived: boolean;
  visibility: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(title);
  const [error, setError] = useState<string | null>(null);

  async function patch(data: { title?: string; favourite?: boolean; archived?: boolean; visibility?: "private" | "household" }) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn’t save that change.");
      }
      router.refresh();
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn’t save that change.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName) {
      setError("Give the book a name before saving.");
      return;
    }
    if (await patch({ title: nextName })) setEditingName(false);
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
    <details className={styles.options}>
      <summary>Book options <span aria-hidden="true">+</span></summary>
      <div className={styles.actions}>
      {editingName ? (
        <form className={styles.renameForm} onSubmit={rename}>
          <label className={styles.srOnly} htmlFor={`book-name-${bookId}`}>Book name</label>
          <input id={`book-name-${bookId}`} className="input" value={name} maxLength={160} onChange={(event) => setName(event.target.value)} autoFocus />
          <button className="btn btn-primary" disabled={busy}>Save name</button>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => { setName(title); setEditingName(false); setError(null); }}>Cancel</button>
        </form>
      ) : (
        <button className="btn btn-secondary" onClick={() => setEditingName(true)} disabled={busy}>Rename</button>
      )}
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
      <button className="btn btn-secondary" onClick={() => patch({ visibility: visibility === "household" ? "private" : "household" })} disabled={busy}>
        {visibility === "household" ? "Keep private" : "Share with kitchen"}
      </button>
      <button className={styles.deleteBtn} onClick={remove} disabled={busy}>
        Delete
      </button>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
    </details>
  );
}
