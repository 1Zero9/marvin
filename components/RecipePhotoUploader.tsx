"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./RecipePhotoUploader.module.css";

type PreparedImage = { id: string; data: string; mimeType: string; preview: string; name: string };

async function prepareImage(file: File): Promise<PreparedImage> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = objectUrl;
    });
    const maxSize = 1600;
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    return { id: crypto.randomUUID(), data: dataUrl.split(",")[1], mimeType: "image/jpeg", preview: dataUrl, name: file.name || "Photo" };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function RecipePhotoUploader({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PreparedImage[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addPhoto(files: FileList | null) {
    const selected = Array.from(files ?? []).slice(0, 6);
    if (!selected.length) return;
    setBusy(true);
    setError(null);
    try {
      const images = await Promise.all(selected.map(prepareImage));
      setPending(images);
      for (const [index, image] of images.entries()) {
        setProgress(`Adding ${index + 1} of ${images.length}…`);
        const response = await fetch(`/api/recipes/${recipeId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: image.data, mimeType: image.mimeType }),
        });
        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(result?.error ?? "Couldn’t add that photo.");
        }
      }
      setProgress("Photos added");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn’t add that photo.");
    } finally {
      setBusy(false);
      setTimeout(() => setProgress(null), 1400);
      if (cameraRef.current) cameraRef.current.value = "";
      if (libraryRef.current) libraryRef.current.value = "";
    }
  }

  return (
    <section className={`card ${styles.card}`}>
      <div>
        <h2>Finished photo</h2>
        <p>Add a photo of the finished dish whenever you have it. It stays with this recipe, not a cook log.</p>
      </div>
      <input ref={cameraRef} className={styles.fileInput} type="file" accept="image/*" capture="environment" multiple onChange={(event) => addPhoto(event.target.files)} />
      <input ref={libraryRef} className={styles.fileInput} type="file" accept="image/*" multiple onChange={(event) => addPhoto(event.target.files)} />
      <div className={styles.actions}>
        <button type="button" className="btn btn-secondary" onClick={() => cameraRef.current?.click()} disabled={busy}>📷 Take a photo</button>
        <button type="button" className="btn btn-secondary" onClick={() => libraryRef.current?.click()} disabled={busy}>🖼 Choose from library</button>
      </div>
      {pending.length > 0 && <div className={styles.previewList}>{pending.map((image) => <div className={styles.preview} key={image.id}><img src={image.preview} alt="" /><span>{image.name}</span></div>)}</div>}
      {progress && <p className={styles.status} aria-live="polite">{progress}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
  );
}
