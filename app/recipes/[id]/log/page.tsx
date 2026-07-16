"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./log.module.css";

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

export default function LogCookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<
    { data: string; mimeType: string; preview: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("marvin-snap");
    if (!raw) return;
    sessionStorage.removeItem("marvin-snap");
    try {
      const snap = JSON.parse(raw);
      if (snap?.data && snap?.preview) {
        setPhotos([
          { data: snap.data, mimeType: snap.mimeType, preview: snap.preview },
        ]);
      }
    } catch {}
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
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${id}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cookedAt: date,
          rating: rating || null,
          notes,
          photos: photos.map((p) => ({ data: p.data, mimeType: p.mimeType })),
        }),
      });
      if (!res.ok) throw new Error();
      router.push(`/recipes/${id}`);
      router.refresh();
    } catch {
      setError("Couldn't save the cook log. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Log a cook</h1>
      {error && <p className={styles.error}>{error}</p>}

      <section className={`card ${styles.form}`}>
        <label className={styles.label}>
          When did you cook it?
          <input
            className="input"
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <div className={styles.label}>
          How was it?
          <div className={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={styles.star}
                onClick={() => setRating(n === rating ? 0 : n)}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
              >
                {n <= rating ? "★" : "☆"}
              </button>
            ))}
          </div>
        </div>

        <label className={styles.label}>
          Notes
          <textarea
            className={`input ${styles.textarea}`}
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What worked, what you'd change…"
          />
        </label>

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

        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save cook log"}
        </button>
      </section>
    </div>
  );
}
