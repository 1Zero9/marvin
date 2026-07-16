"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import BarcodeScanner from "@/components/BarcodeScanner";
import IndexExtractor from "@/components/IndexExtractor";
import styles from "./add.module.css";

type Meta = {
  isbn: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  pageCount: number | null;
};

type Step = "scan" | "confirm" | "photos" | "review" | "done";

export default function AddBookPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("scan");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"private" | "household">("private");
  const [entriesCount, setEntriesCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onIsbn = useCallback(async (isbn: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/isbn/${isbn}`);
      if (res.ok) {
        setMeta(await res.json());
      } else {
        setMeta({ isbn, title: "", author: null, coverUrl: null, pageCount: null });
        setError("Couldn't find this ISBN — enter the details manually.");
      }
      setStep("confirm");
    } catch {
      setError("Lookup failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  async function saveBook() {
    if (!meta?.title.trim()) {
      setError("Title is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...meta, visibility }),
      });
      if (!res.ok) throw new Error();
      const book = await res.json();
      setBookId(book.id);
      setStep("photos");
    } catch {
      setError("Couldn't save the book. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Add a book</h1>
      <ol className={styles.steps}>
        {(["scan", "confirm", "photos", "review"] as Step[]).map((s, i) => (
          <li
            key={s}
            className={`${styles.step} ${step === s ? styles.stepActive : ""}`}
          >
            {i + 1}. {s === "scan" ? "Scan" : s === "confirm" ? "Details" : s === "photos" ? "Index" : "Review"}
          </li>
        ))}
      </ol>

      {error && <p className={styles.error}>{error}</p>}

      {step === "scan" && (
        <section className="card">
          <p className={styles.hint}>
            Point the camera at the barcode on the back of the book.
          </p>
          <BarcodeScanner onDetected={onIsbn} />
          {busy && <p className={styles.hint}>Looking up ISBN…</p>}
        </section>
      )}

      {step === "confirm" && meta && (
        <section className={`card ${styles.form}`}>
          {meta.coverUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={meta.coverUrl} alt="" className={styles.cover} />
          )}
          <label className={styles.label}>
            Title
            <input
              className="input"
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
            />
          </label>
          <label className={styles.label}>
            Author
            <input
              className="input"
              value={meta.author ?? ""}
              onChange={(e) => setMeta({ ...meta, author: e.target.value })}
            />
          </label>
          <label className={styles.label}>
            ISBN
            <input
              className="input"
              inputMode="numeric"
              value={meta.isbn}
              onChange={(e) => setMeta({ ...meta, isbn: e.target.value })}
            />
          </label>
          <label className={styles.label}>
            Who can see this book?
            <select className="input" value={visibility} onChange={(e) => setVisibility(e.target.value as "private" | "household")}>
              <option value="private">Only me</option>
              <option value="household">Everyone in my kitchen</option>
            </select>
          </label>
          <div className={styles.actions}>
            <button className="btn btn-secondary" onClick={() => setStep("scan")}>
              Back
            </button>
            <button className="btn btn-primary" onClick={saveBook} disabled={busy}>
              {busy ? "Saving…" : "Save & photograph index"}
            </button>
          </div>
        </section>
      )}

      {(step === "photos" || step === "review") && bookId && (
        <IndexExtractor
          bookId={bookId}
          onDone={(count) => {
            setEntriesCount(count);
            setStep("done");
          }}
          onSkip={() => setStep("done")}
          onModeChange={(mode) => setStep(mode)}
        />
      )}

      {step === "done" && (
        <section className={`card ${styles.done}`}>
          <h2>Book added!</h2>
          <p>
            {meta?.title} is on your shelf
            {entriesCount > 0 ? ` with ${entriesCount} index entries.` : "."}
          </p>
          <div className={styles.actions}>
            <button className="btn btn-secondary" onClick={() => router.push("/")}>
              Search it
            </button>
            <button className="btn btn-primary" onClick={() => router.push("/books")}>
              View books
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
