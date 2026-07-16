"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./BookCover.module.css";

async function resizeImage(file: File): Promise<{ data: string; mimeType: string }> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });
  const max = 800;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  return {
    data: canvas.toDataURL("image/jpeg", 0.82).split(",")[1],
    mimeType: "image/jpeg",
  };
}

export default function BookCover({
  bookId,
  coverUrl,
  title,
}: {
  bookId: string;
  coverUrl: string | null;
  title: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { data, mimeType } = await resizeImage(file);
      await fetch(`/api/books/${bookId}/cover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, mimeType }),
      });
      router.refresh();
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className={styles.wrap}>
      {coverUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={coverUrl} alt="" className={styles.cover} />
      ) : (
        <div className={styles.fallback}>{title.slice(0, 1)}</div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className={styles.fileInput}
        onChange={(e) => onFile(e.target.files)}
      />
      <button
        className={styles.photoBtn}
        onClick={() => fileRef.current?.click()}
        disabled={busy}
      >
        {busy ? "Uploading…" : coverUrl ? "Replace cover" : "📷 Add cover"}
      </button>
    </div>
  );
}
