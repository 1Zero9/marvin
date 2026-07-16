"use client";

import { useRef, useState } from "react";
import Link from "next/link";
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
  const [photo, setPhoto] = useState<{
    data: string;
    mimeType: string;
    preview: string;
  } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const resized = await resizeImage(file);
      setPhoto(resized);
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: resized.data, mimeType: resized.mimeType }),
      });
      if (!res.ok) throw new Error();
      setResult(await res.json());
    } catch {
      setError("Couldn't identify that photo. Try another one.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function stashPhoto(title?: string) {
    if (photo) {
      sessionStorage.setItem(
        "marvin-snap",
        JSON.stringify({
          data: photo.data,
          mimeType: photo.mimeType,
          preview: photo.preview,
          title: title ?? null,
        })
      );
    }
  }

  function logCook(recipeId: string) {
    stashPhoto();
    router.push(`/recipes/${recipeId}/log`);
  }

  function saveAsRecipe() {
    stashPhoto(result?.dish ?? undefined);
    router.push("/recipes/add");
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Snap your dinner</h1>
      <p className={styles.sub}>
        Take a photo of what you cooked and Marvin will work out what it is.
      </p>

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
          {result.dish ? (
            <>
              <div className={`card ${styles.guess}`}>
                <h2 className={styles.guessTitle}>
                  Looks like <span className={styles.dish}>{result.dish}</span>
                </h2>
                {result.ingredients.length > 0 && (
                  <p className={styles.ingredients}>
                    A meal with {result.ingredients.join(", ")}.
                  </p>
                )}
                <p className={styles.question}>Do you want to log it?</p>
              </div>

              {result.matches.length > 0 && (
                <div className={`card ${styles.matches}`}>
                  <h3 className={styles.matchesTitle}>
                    Matches your recipes
                  </h3>
                  <ul className={styles.matchList}>
                    {result.matches.map((m) => (
                      <li key={m.id} className={styles.matchItem}>
                        <div>
                          <Link
                            href={`/recipes/${m.id}`}
                            className={styles.matchLink}
                          >
                            {m.title}
                          </Link>
                          <p className={styles.matchMeta}>
                            {m.bookTitle
                              ? `${m.bookTitle}${m.pageRef ? ` · p.${m.pageRef}` : ""}`
                              : "My own recipe"}
                          </p>
                        </div>
                        <button
                          className="btn btn-primary"
                          onClick={() => logCook(m.id)}
                        >
                          Log it
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className={styles.actions}>
                <button className="btn btn-primary" onClick={saveAsRecipe}>
                  {result.matches.length > 0
                    ? "Save as a new recipe instead"
                    : "Save as a new recipe"}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => fileRef.current?.click()}
                >
                  Try another photo
                </button>
              </div>
            </>
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
