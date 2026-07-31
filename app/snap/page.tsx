"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./snap.module.css";
import ScanningDisclosure from "@/components/ScanningDisclosure";

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
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
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
  const [countsAsCooked, setCountsAsCooked] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
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
    setCountsAsCooked(true);
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
      if (cameraRef.current) cameraRef.current.value = "";
      if (libraryRef.current) libraryRef.current.value = "";
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
          countsAsCooked,
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

  async function createRecipeDraft() {
    if (!photo) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/recipes/create-from-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: photo.data, mimeType: photo.mimeType, titleHint: dishName.trim() || result?.dish || "" }),
      });
      const draft = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof draft?.error === "string" ? draft.error : "Couldn't make a recipe draft from that photo.");
      sessionStorage.setItem("marvin-snap-recipe", JSON.stringify({ ...photo, ...draft }));
      router.push("/recipes/add");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn't make a recipe draft from that photo.");
      setCreating(false);
    }
  }

  return (
    <div className={styles.wrap}>
      {!result && <h1 className={styles.title}>Snap your dinner</h1>}
      {!result && !busy && (
        <p className={styles.sub}>
          Take a photo of what you cooked, or choose one from your photo library — Marvin works out the rest.
        </p>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className={styles.fileInput}
        onChange={(e) => onFile(e.target.files)}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        className={styles.fileInput}
        onChange={(e) => onFile(e.target.files)}
      />

      {!photo && (
        <><ScanningDisclosure kind="food" /><div className={styles.photoActions}><button
          className={`btn btn-primary ${styles.bigSnap}`}
          onClick={() => cameraRef.current?.click()}
          disabled={busy}
        >
          📷 Take a photo
        </button><button
          className={`btn btn-secondary ${styles.libraryButton}`}
          onClick={() => libraryRef.current?.click()}
          disabled={busy}
        >
          🖼 Choose from library
        </button></div></>
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

              <label className={styles.retrospective}>
                <input type="checkbox" checked={!countsAsCooked} onChange={(event) => setCountsAsCooked(!event.target.checked)} />
                <span><strong>This is a past meal</strong><small>Save the photo and memory, but don&rsquo;t count it as cooked now.</small></span>
              </label>

              <button
                className={`btn btn-primary ${styles.saveBtn}`}
                onClick={saveLog}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save to my log"}
              </button>

              <button type="button" className="btn btn-secondary" onClick={createRecipeDraft} disabled={creating}>
                {creating ? "Creating an editable recipe…" : "✨ Create a recipe from this photo"}
              </button>
              <p className={styles.draftHint}>Marvin will make a best-guess draft. You&rsquo;ll review and edit every detail before saving.</p>

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
                    onClick={() => cameraRef.current?.click()}
                  >
                    Take another photo
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => libraryRef.current?.click()}
                  >
                    Choose from library
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
                onClick={() => cameraRef.current?.click()}
              >
                Take another photo
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => libraryRef.current?.click()}
              >
                Choose from library
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
