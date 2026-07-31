"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./RecipePhotoUploader.module.css";

async function prepareImage(file: File) {
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
    return { data: dataUrl.split(",")[1], mimeType: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function RecipePhotoUploader({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addPhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const image = await prepareImage(file);
      const response = await fetch(`/api/recipes/${recipeId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(image),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error ?? "Couldn’t add that photo.");
      }
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn’t add that photo.");
    } finally {
      setBusy(false);
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
      <input ref={cameraRef} className={styles.fileInput} type="file" accept="image/*" capture="environment" onChange={(event) => addPhoto(event.target.files)} />
      <input ref={libraryRef} className={styles.fileInput} type="file" accept="image/*" onChange={(event) => addPhoto(event.target.files)} />
      <div className={styles.actions}>
        <button type="button" className="btn btn-secondary" onClick={() => cameraRef.current?.click()} disabled={busy}>📷 Take a photo</button>
        <button type="button" className="btn btn-secondary" onClick={() => libraryRef.current?.click()} disabled={busy}>🖼 Choose from library</button>
      </div>
      {busy && <p className={styles.status}>Adding photo…</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
  );
}
