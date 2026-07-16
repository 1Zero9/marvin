"use client";

import { useRef, useState } from "react";
import styles from "./IndexExtractor.module.css";

export type IndexEntry = { ingredient: string; dish: string; page: number };

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

export default function IndexExtractor({
  bookId,
  onDone,
  onSkip,
  onModeChange,
}: {
  bookId: string;
  onDone: (count: number) => void;
  onSkip?: () => void;
  onModeChange?: (mode: "photos" | "review") => void;
}) {
  const [mode, setModeState] = useState<"photos" | "review">("photos");
  const [images, setImages] = useState<
    { data: string; mimeType: string; preview: string }[]
  >([]);
  const [entries, setEntries] = useState<IndexEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractDone, setExtractDone] = useState(0);
  const [extractTotal, setExtractTotal] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  function setMode(m: "photos" | "review") {
    setModeState(m);
    onModeChange?.(m);
  }

  async function onFiles(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    try {
      const resized = await Promise.all(Array.from(files).map(resizeImage));
      setImages((prev) => [...prev, ...resized].slice(0, 10));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function extractOne(
    img: { data: string; mimeType: string },
    photoNumber: number,
    attempt = 0
  ): Promise<IndexEntry[]> {
    let res: Response;
    try {
      res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: [{ data: img.data, mimeType: img.mimeType }],
        }),
      });
    } catch {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        return extractOne(img, photoNumber, attempt + 1);
      }
      throw new Error(
        `Lost connection on photo ${photoNumber}. Keep the app open and try again.`
      );
    }
    let data: { entries?: IndexEntry[]; error?: string } | null = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      if (attempt < 2 && (res.status >= 500 || res.status === 429)) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        return extractOne(img, photoNumber, attempt + 1);
      }
      throw new Error(
        data?.error ??
          (res.status === 413
            ? `Photo ${photoNumber} is too large — remove it and retake.`
            : `Extraction failed on photo ${photoNumber} (${res.status}). Try again.`)
      );
    }
    return data?.entries ?? [];
  }

  async function extract() {
    setBusy(true);
    setError(null);
    setExtractDone(0);
    setExtractTotal(images.length);
    let wakeLock: { release: () => Promise<void> } | null = null;
    try {
      try {
        wakeLock =
          (await (
            navigator as Navigator & {
              wakeLock?: {
                request: (t: string) => Promise<{ release: () => Promise<void> }>;
              };
            }
          ).wakeLock?.request("screen")) ?? null;
      } catch {}

      const results: IndexEntry[][] = new Array(images.length);
      let next = 0;
      const worker = async () => {
        while (next < images.length) {
          const i = next++;
          results[i] = await extractOne(
            { data: images[i].data, mimeType: images[i].mimeType },
            i + 1
          );
          setExtractDone((d) => d + 1);
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(2, images.length) }, worker)
      );

      const merged = results.flat();
      setEntries(merged);
      if (merged.length === 0) {
        setError("Nothing extracted — try clearer photos.");
      } else {
        setMode("review");
      }
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Extraction failed.");
    } finally {
      setBusy(false);
      setExtractTotal(0);
      wakeLock?.release().catch(() => {});
    }
  }

  async function saveEntries() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) throw new Error();
      onDone(entries.length);
    } catch {
      setError("Couldn't save entries. Try again.");
      setBusy(false);
    }
  }

  function updateEntry(i: number, field: keyof IndexEntry, value: string) {
    setEntries((prev) =>
      prev.map((e, idx) =>
        idx === i
          ? { ...e, [field]: field === "page" ? Number(value) || 0 : value }
          : e
      )
    );
  }

  return (
    <>
      {error && <p className={styles.error}>{error}</p>}

      {mode === "photos" && (
        <section className={`card ${styles.form}`}>
          <p className={styles.hint}>
            Photograph the book&rsquo;s index pages — one photo per page, good
            light, text flat and readable.
          </p>
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
            className="btn btn-secondary"
            onClick={() => fileRef.current?.click()}
            disabled={busy || images.length >= 10}
          >
            {images.length === 0 ? "Take photo" : "Add another photo"}
          </button>
          {images.length > 0 && (
            <div className={styles.thumbs}>
              {images.map((img, i) => (
                <div key={i} className={styles.thumbBox}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.preview}
                    alt={`Index page ${i + 1}`}
                    className={styles.thumb}
                  />
                  <button
                    className={styles.thumbRemove}
                    onClick={() =>
                      setImages((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {busy && extractTotal > 0 && (
            <div className={styles.progressWrap}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${Math.max(4, (extractDone / extractTotal) * 100)}%`,
                  }}
                />
              </div>
              <p className={styles.progressText}>
                Reading your index — {extractDone} of {extractTotal} photo
                {extractTotal === 1 ? "" : "s"} done. Keep the app open; your
                screen will stay awake.
              </p>
            </div>
          )}
          <div className={styles.actions}>
            {onSkip && (
              <button className="btn btn-secondary" onClick={onSkip}>
                Skip for now
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={extract}
              disabled={busy || images.length === 0}
            >
              {busy ? "Extracting…" : `Extract index (${images.length})`}
            </button>
          </div>
        </section>
      )}

      {mode === "review" && (
        <section className={`card ${styles.form}`}>
          <p className={styles.hint}>
            {entries.length} entries found. Fix anything that looks wrong, then
            save.
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Dish</th>
                  <th className={styles.pageCol}>Page</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        className="input"
                        value={e.ingredient}
                        onChange={(ev) =>
                          updateEntry(i, "ingredient", ev.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        value={e.dish}
                        onChange={(ev) => updateEntry(i, "dish", ev.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        inputMode="numeric"
                        value={e.page || ""}
                        onChange={(ev) => updateEntry(i, "page", ev.target.value)}
                      />
                    </td>
                    <td>
                      <button
                        className={styles.thumbRemove}
                        onClick={() =>
                          setEntries((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        aria-label="Remove entry"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.actions}>
            <button className="btn btn-secondary" onClick={() => setMode("photos")}>
              Back
            </button>
            <button
              className="btn btn-primary"
              onClick={saveEntries}
              disabled={busy || entries.length === 0}
            >
              {busy ? "Saving…" : `Save ${entries.length} entries`}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
