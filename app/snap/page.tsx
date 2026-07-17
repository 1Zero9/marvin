"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./snap.module.css";

type Match = {
  id: string;
  title: string;
  source: string;
  bookTitle: string | null;
  pageRef: number | null;
};

type Result = {
  dish: string | null;
  ingredients: string[];
  matches: Match[];
};

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
  const max = 1280;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  return { data: dataUrl.split(",")[1], mimeType: "image/jpeg", preview: dataUrl };
}

export default function SnapPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [photo, setPhoto] = useState<{
    data: string;
    mimeType: string;
    preview: string;
  } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [dishName, setDishName] = useState("");
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(today);
  const [moreOpen, setMoreOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setSelectedMatch(null);
    setRating(0);
    setNotes("");
    setMoreOpen(false);
    try {
      const resized = await resizeImage(file);
      setPhoto(resized);
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: resized.data, mimeType: resized.mimeType }),
      });
      if (!res.ok) throw new Error();
      const identified: Result = await res.json();
      setResult(identified);
      setDishName(identified.dish ?? "");
    } catch {
      setError("Couldn't identify that photo. Try another one.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveLog() {
    if (!selectedMatch && !dishName.trim()) {
      setError("Give the dish a name first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/logs/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId: selectedMatch,
          title: dishName.trim(),
          rating: rating || null,
          notes,
          cookedAt: date,
          ingredients: result?.ingredients ?? [],
          photo: photo ? { data: photo.data, mimeType: photo.mimeType } : null,
        }),
      });
      if (!res.ok) throw new Error();
      router.push("/log");
      router.refresh();
    } catch {
      setError("Couldn't save that. Try again.");
      setSaving(false);
    }
  }

  function openFullForm() {
    if (photo) {
      sessionStorage.setItem(
        "marvin-snap",
        JSON.stringify({
          data: photo.data,
          mimeType: photo.mimeType,
          preview: photo.preview,
          title: dishName.trim() || result?.dish || null,
        })
      );
    }
    router.push("/recipes/add");
  }

  return (
    <div className={styles.wrap}>
      {!result && <h1 className={styles.title}>Snap your dinner</h1>}
      {!result && !busy && (
        <p className={styles.sub}>
          Take a photo of what you cooked — Marvin works out the rest.
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className={styles.fileInput}
        onChange={(e) => onFile(e.target.files)}
      />

      {!photo && (
        <button
          className={`btn btn-primary ${styles.bigSnap}`}
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          📷 Take a photo
        </button>
      )}

      {photo && (
        <div className={styles.photoBox}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.preview} alt="" className={styles.photo} />
        </div>
      )}

      {busy && (
        <div className={`card ${styles.thinking}`}>
          <span className={styles.spinner} />
          Having a look at your plate…
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {result && !busy && (
        <div className={styles.results}>
          {result.dish !== null ? (
            <div className={`card ${styles.quickCard}`}>
              {result.matches.length > 0 && (
                <div className={styles.chips}>
                  <button
                    type="button"
                    className={`${styles.chip} ${selectedMatch === null ? styles.chipActive : ""}`}
                    onClick={() => setSelectedMatch(null)}
                  >
                    ✨ New dish
                  </button>
                  {result.matches.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`${styles.chip} ${selectedMatch === m.id ? styles.chipActive : ""}`}
                      onClick={() => setSelectedMatch(m.id)}
                    >
                      {m.title}
                      {m.bookTitle ? ` · ${m.bookTitle}` : ""}
                    </button>
                  ))}
                </div>
              )}

              {selectedMatch === null && (
                <input
                  className={`input ${styles.dishInput}`}
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  placeholder="What did you make?"
                  aria-label="Dish name"
                />
              )}

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

              <textarea
                className={`input ${styles.notes}`}
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes? Who loved it? (optional)"
              />

              <button
                className={`btn btn-primary ${styles.saveBtn}`}
                onClick={saveLog}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save to my log"}
              </button>

              <button
                type="button"
                className={styles.moreToggle}
                onClick={() => setMoreOpen((v) => !v)}
              >
                {moreOpen ? "Fewer options" : "More options"}
              </button>

              {moreOpen && (
                <div className={styles.moreBox}>
                  <label className={styles.moreLabel}>
                    When was it?
                    <input
                      className="input"
                      type="date"
                      value={date}
                      max={today}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={openFullForm}
                  >
                    Add full recipe details
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => fileRef.current?.click()}
                  >
                    Try another photo
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={`card ${styles.guess}`}>
              <h2 className={styles.guessTitle}>
                That doesn&rsquo;t look like food to me
              </h2>
              <p className={styles.question}>Try another photo of your plate.</p>
              <button
                className="btn btn-secondary"
                onClick={() => fileRef.current?.click()}
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
