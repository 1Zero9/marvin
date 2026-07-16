"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./add.module.css";

type BookOption = { id: string; title: string; author: string | null };

async function resizeImage(
  file: File
): Promise<{ data: string; mimeType: string; preview: string }> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });
  const max = 1600;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  return { data: dataUrl.split(",")[1], mimeType: "image/jpeg", preview: dataUrl };
}

export default function AddRecipePage() {
  const router = useRouter();
  const [books, setBooks] = useState<BookOption[]>([]);
  const [source, setSource] = useState<"personal" | "book">("personal");
  const [title, setTitle] = useState("");
  const [bookId, setBookId] = useState("");
  const [pageRef, setPageRef] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [links, setLinks] = useState<string[]>([""]);
  const [photos, setPhotos] = useState<
    { data: string; mimeType: string; preview: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then(setBooks)
      .catch(() => {});
  }, []);

  async function onFiles(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    try {
      const resized = await Promise.all(Array.from(files).map(resizeImage));
      setPhotos((prev) => [...prev, ...resized].slice(0, 6));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          source,
          bookId: source === "book" ? bookId || null : null,
          pageRef:
            source === "book" && pageRef ? Number(pageRef) || null : null,
          ingredients,
          instructions,
          notes,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          links: links.map((l) => l.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error();
      const recipe = await res.json();
      for (const p of photos) {
        await fetch(`/api/recipes/${recipe.id}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: p.data, mimeType: p.mimeType }),
        });
      }
      router.push(`/recipes/${recipe.id}`);
    } catch {
      setError("Couldn't save the recipe. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Add a recipe</h1>
      {error && <p className={styles.error}>{error}</p>}

      <section className={`card ${styles.form}`}>
        <div className={styles.sourceRow}>
          <button
            className={`${styles.sourcePill} ${source === "personal" ? styles.sourceActive : ""}`}
            onClick={() => setSource("personal")}
            type="button"
          >
            My own
          </button>
          <button
            className={`${styles.sourcePill} ${source === "book" ? styles.sourceActive : ""}`}
            onClick={() => setSource("book")}
            type="button"
          >
            From a book
          </button>
        </div>

        <label className={styles.label}>
          Title
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Weeknight potato gratin"
          />
        </label>

        {source === "book" && (
          <div className={styles.bookRow}>
            <label className={styles.label}>
              Book
              <select
                className="input"
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
              >
                <option value="">Choose a book…</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                    {b.author ? ` — ${b.author}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.label}>
              Page
              <input
                className="input"
                inputMode="numeric"
                value={pageRef}
                onChange={(e) => setPageRef(e.target.value)}
                placeholder="e.g. 118"
              />
            </label>
          </div>
        )}

        <label className={styles.label}>
          Ingredients
          <textarea
            className={`input ${styles.textarea}`}
            rows={5}
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder={"One per line\ne.g. 800g potatoes"}
          />
        </label>

        <label className={styles.label}>
          Instructions
          <textarea
            className={`input ${styles.textarea}`}
            rows={7}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </label>

        <label className={styles.label}>
          Notes
          <textarea
            className={`input ${styles.textarea}`}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tweaks, serving ideas, who liked it…"
          />
        </label>

        <label className={styles.label}>
          Tags
          <input
            className="input"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="comma separated, e.g. quick, veggie"
          />
        </label>

        <div className={styles.label}>
          Links
          {links.map((l, i) => (
            <div key={i} className={styles.linkRow}>
              <input
                className="input"
                type="url"
                value={l}
                onChange={(e) =>
                  setLinks((prev) =>
                    prev.map((x, idx) => (idx === i ? e.target.value : x))
                  )
                }
                placeholder="https://…"
              />
              {links.length > 1 && (
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() =>
                    setLinks((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  aria-label="Remove link"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className={styles.addLinkBtn}
            onClick={() => setLinks((prev) => [...prev, ""])}
          >
            + Add another link
          </button>
        </div>

        <div className={styles.label}>
          Photos
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className={styles.fileInput}
            onChange={(e) => onFiles(e.target.files)}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fileRef.current?.click()}
            disabled={busy || photos.length >= 6}
          >
            {photos.length === 0 ? "Add photos" : "Add another photo"}
          </button>
          {photos.length > 0 && (
            <div className={styles.thumbs}>
              {photos.map((p, i) => (
                <div key={i} className={styles.thumbBox}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview} alt="" className={styles.thumb} />
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() =>
                      setPhotos((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          className="btn btn-primary"
          onClick={save}
          disabled={busy}
        >
          {busy ? "Saving…" : "Save recipe"}
        </button>
      </section>
    </div>
  );
}
