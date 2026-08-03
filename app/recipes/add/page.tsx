"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./add.module.css";
import ScanningDisclosure from "@/components/ScanningDisclosure";
import type { RecipeSource } from "@/lib/recipeSource";
import { stripHtmlToText } from "@/lib/htmlRecipe";
import VoiceDictation from "@/components/VoiceDictation";

type BookOption = { id: string; title: string; author: string | null };
type EntryMode = "choose" | "paste" | "photo" | "link" | "quick";
type RecipePhoto = { data: string; mimeType: string; preview: string };

async function resizeImage(file: File): Promise<RecipePhoto> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AddRecipePage() {
  const router = useRouter();
  const scanCameraRef = useRef<HTMLInputElement>(null);
  const scanLibraryRef = useRef<HTMLInputElement>(null);
  const photoCameraRef = useRef<HTMLInputElement>(null);
  const photoLibraryRef = useRef<HTMLInputElement>(null);
  const pasteFileRef = useRef<HTMLInputElement>(null);
  const [books, setBooks] = useState<BookOption[]>([]);
  const [entryMode, setEntryMode] = useState<EntryMode>("choose");
  const [source, setSource] = useState<RecipeSource>("personal");
  const [title, setTitle] = useState("");
  const [bookId, setBookId] = useState("");
  const [pageRef, setPageRef] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [links, setLinks] = useState<string[]>([""]);
  const [visibility, setVisibility] = useState<"private" | "household">("household");
  const [photos, setPhotos] = useState<RecipePhoto[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [photoDraft, setPhotoDraft] = useState(false);
  const [fetchingLink, setFetchingLink] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/books").then((response) => response.json()).then(setBooks).catch(() => {});
    const raw = sessionStorage.getItem("marvin-snap");
    if (raw) {
      sessionStorage.removeItem("marvin-snap");
      try {
        const snap = JSON.parse(raw);
        if (snap?.title) setTitle(snap.title);
        if (snap?.data && snap?.preview) setPhotos([{ data: snap.data, mimeType: snap.mimeType, preview: snap.preview }]);
        setEntryMode("quick");
      } catch {}
    }
    const recipeDraft = sessionStorage.getItem("marvin-snap-recipe");
    if (!recipeDraft) return;
    sessionStorage.removeItem("marvin-snap-recipe");
    try {
      const draft = JSON.parse(recipeDraft);
      if (draft?.title) setTitle(draft.title);
      if (draft?.ingredients) setIngredients(draft.ingredients);
      if (draft?.instructions) setInstructions(draft.instructions);
      if (draft?.notes) setNotes(draft.notes);
      if (Array.isArray(draft?.tags)) setTags(draft.tags.filter((tag: unknown) => typeof tag === "string").join(", "));
      if (draft?.data && draft?.preview) setPhotos([{ data: draft.data, mimeType: draft.mimeType, preview: draft.preview }]);
      setPhotoDraft(true);
      setScanned(true);
      setEntryMode("quick");
    } catch {}
  }, []);

  function choose(mode: EntryMode) {
    setEntryMode(mode);
    setError(null);
  }

  function applyExtracted(extracted: { title?: string | null; ingredients?: string; instructions?: string; notes?: string; tags?: string[] }) {
    if (extracted.title && !title.trim()) setTitle(extracted.title);
    if (extracted.ingredients) setIngredients(extracted.ingredients);
    if (extracted.instructions) setInstructions(extracted.instructions);
    if (extracted.notes) setNotes((current) => current || extracted.notes!);
    if (extracted.tags?.length) {
      setTags((current) => Array.from(new Set([...current.split(",").map((tag) => tag.trim()).filter(Boolean), ...extracted.tags!])).join(", "));
    }
    setScanned(true);
    setEntryMode("quick");
  }

  async function readPhotos(files: FileList | null) {
    if (!files?.length) return;
    setReading(true);
    setError(null);
    try {
      const resized = await Promise.all(Array.from(files).slice(0, 6).map(resizeImage));
      setPhotos(resized);
      const response = await fetch("/api/recipes/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: resized.map(({ data, mimeType }) => ({ data, mimeType })) }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn’t read that recipe.");
      }
      applyExtracted(await response.json());
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn’t read that recipe.");
    } finally {
      setReading(false);
      if (scanCameraRef.current) scanCameraRef.current.value = "";
      if (scanLibraryRef.current) scanLibraryRef.current.value = "";
    }
  }

  async function sortPastedText() {
    if (pasteText.trim().length < 20) {
      setError("Paste a little more of the recipe first.");
      return;
    }
    setReading(true);
    setError(null);
    try {
      const response = await fetch("/api/recipes/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pasteText }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn’t make sense of that text.");
      }
      applyExtracted(await response.json());
      setPasteText("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn’t make sense of that text.");
    } finally {
      setReading(false);
    }
  }

  async function fetchFromLink() {
    const url = links[0]?.trim();
    if (!url) {
      setError("Paste the recipe link first.");
      return;
    }
    setFetchingLink(true);
    setError(null);
    try {
      const response = await fetch("/api/recipes/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn’t read that link.");
      }
      applyExtracted(await response.json());
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn’t read that link.");
    } finally {
      setFetchingLink(false);
    }
  }

  async function handlePasteFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setReading(true);
    setError(null);
    try {
      if (/\.docx$/i.test(file.name)) {
        const data = await fileToBase64(file);
        const response = await fetch("/api/recipes/import-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data, filename: file.name }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error ?? "Couldn’t read that file.");
        }
        const { text } = await response.json();
        setPasteText(text);
      } else {
        const raw = await file.text();
        const looksLikeHtml = /<html|<!doctype html|<body/i.test(raw);
        setPasteText(looksLikeHtml ? stripHtmlToText(raw) : raw.slice(0, 40000));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn’t read that file.");
    } finally {
      setReading(false);
      if (pasteFileRef.current) pasteFileRef.current.value = "";
    }
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const resized = await Promise.all(Array.from(files).map(resizeImage));
      setPhotos((current) => [...current, ...resized].slice(0, 6));
    } finally {
      setBusy(false);
      if (photoCameraRef.current) photoCameraRef.current.value = "";
      if (photoLibraryRef.current) photoLibraryRef.current.value = "";
    }
  }

  async function save() {
    if (!title.trim()) {
      setError("Give the recipe a name first — the rest can wait.");
      return;
    }
    if (entryMode === "link" && !links[0]?.trim()) {
      setError("Paste the recipe link, or choose ‘Just the basics’ instead.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          source,
          bookId: source !== "personal" ? bookId || null : null,
          pageRef: source !== "personal" && pageRef ? Number(pageRef) || null : null,
          ingredients,
          instructions,
          notes,
          tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          links: links.map((link) => link.trim()).filter(Boolean),
          visibility,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn’t save the recipe.");
      }
      const recipe = await response.json();
      for (const photo of photos) {
        const upload = await fetch(`/api/recipes/${recipe.id}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: photo.data, mimeType: photo.mimeType }),
        });
        if (!upload.ok) throw new Error("The recipe was saved, but one or more photos could not be added.");
      }
      router.push(`/recipes/${recipe.id}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn’t save the recipe.");
      setBusy(false);
    }
  }

  const readyForDetails = entryMode === "quick" || entryMode === "link";
  const captureSteps = [
    { label: "Name", done: Boolean(title.trim()) },
    { label: "Recipe", done: Boolean(ingredients.trim() || instructions.trim()) },
    { label: "Make it yours", done: Boolean(notes.trim() || tags.trim() || photos.length) },
  ];

  return (
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <Link href="/cook" className={styles.back}>← Back to Cook</Link>
        <p className={styles.eyebrow}>Shared kitchen</p>
        <h1 className={styles.title}>Bring a recipe in</h1>
        <p className={styles.sub}>Start with whatever you already have. Marvin can do the sorting, or you can save the name now and fill it in later.</p>
      </header>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {entryMode === "choose" && (
        <section className={styles.choices} aria-label="How would you like to add a recipe?">
          <button type="button" className={styles.choice} onClick={() => choose("paste")}><span>▤</span><strong>Paste from somewhere</strong><small>Notes, email, a web page or a message</small><b>→</b></button>
          <button type="button" className={styles.choice} onClick={() => choose("photo")}><span>▧</span><strong>Use photos or screenshots</strong><small>Marvin reads handwritten pages and recipe images</small><b>→</b></button>
          <button type="button" className={styles.choice} onClick={() => choose("link")}><span>↗</span><strong>Save a recipe link</strong><small>Keep the source now; add details when you want</small><b>→</b></button>
          <button type="button" className={styles.choice} onClick={() => choose("quick")}><span>＋</span><strong>Just the basics</strong><small>Give it a name and build it up later</small><b>→</b></button>
        </section>
      )}

      {entryMode === "paste" && (
        <section className={`card ${styles.captureCard}`}>
          <div className={styles.captureHeader}><div><p className={styles.eyebrow}>Paste a recipe</p><h2>Drop in the whole thing</h2></div><button type="button" className={styles.textButton} onClick={() => choose("choose")}>Choose another way</button></div>
          <textarea className={`input ${styles.textarea}`} rows={10} value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder="Paste from Notes, a message, an email or a recipe page — title, ingredients and method if you have them." autoFocus />
          <input ref={pasteFileRef} type="file" accept=".txt,.html,.htm,.docx" className={styles.fileInput} onChange={(event) => handlePasteFile(event.target.files)} />
          <button type="button" className={styles.textButton} onClick={() => pasteFileRef.current?.click()} disabled={reading}>Or import a file (Word .docx, OneNote export, or .html)</button>
          <button type="button" className="btn btn-primary" onClick={sortPastedText} disabled={reading || !pasteText.trim()}>{reading ? "Making it usable…" : "Sort this recipe out"}</button>
          <ScanningDisclosure kind="recipe" />
        </section>
      )}

      {entryMode === "photo" && (
        <section className={`card ${styles.captureCard}`}>
          <div className={styles.captureHeader}><div><p className={styles.eyebrow}>Photos or screenshots</p><h2>Show Marvin what you have</h2></div><button type="button" className={styles.textButton} onClick={() => choose("choose")}>Choose another way</button></div>
          <input ref={scanCameraRef} type="file" accept="image/*" capture="environment" multiple className={styles.fileInput} onChange={(event) => readPhotos(event.target.files)} />
          <input ref={scanLibraryRef} type="file" accept="image/*" multiple className={styles.fileInput} onChange={(event) => readPhotos(event.target.files)} />
          <div className={styles.photoActions}><button type="button" className={`btn btn-primary ${styles.photoButton}`} onClick={() => scanCameraRef.current?.click()} disabled={reading}>{reading ? "Reading recipe…" : "Take photos"}</button><button type="button" className="btn btn-secondary" onClick={() => scanLibraryRef.current?.click()} disabled={reading}>Choose from library</button></div>
          <p className={styles.captureHint}>You can select up to six images from your camera or photo library: a page, a screenshot, or handwritten notes.</p>
          <ScanningDisclosure kind="recipe" />
        </section>
      )}

      {readyForDetails && (
        <section className={`card ${styles.reviewCard}`}>
          <div className={styles.reviewHeader}>
            <div><p className={styles.eyebrow}>{scanned ? "Ready to check" : entryMode === "link" ? "Save the source" : "Start simple"}</p><h2>{scanned ? "Marvin has filled in what it could" : "Save what you know"}</h2></div>
            <button type="button" className={styles.textButton} onClick={() => choose("choose")}>Start another way</button>
          </div>
          <ol className={styles.captureSteps} aria-label="Recipe progress">
            {captureSteps.map((step, index) => <li key={step.label} className={step.done ? styles.captureStepDone : ""}><span>{step.done ? "✓" : index + 1}</span>{step.label}</li>)}
          </ol>
          {photoDraft && <p className={styles.aiDraft}>AI draft from your photo. Ingredients, amounts and method are estimates — check and edit every detail before cooking or saving.</p>}
          <label className={styles.label}>Recipe name<input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Mum’s chicken traybake" autoFocus={entryMode !== "quick" || !title} /></label>

          {entryMode === "link" && (
            <div className={styles.linkField}>
              <label className={styles.label}>Recipe link<input className="input" type="url" value={links[0] ?? ""} onChange={(event) => setLinks([event.target.value])} placeholder="https://…" /></label>
              <button type="button" className={styles.textButton} onClick={fetchFromLink} disabled={fetchingLink || !links[0]?.trim()}>{fetchingLink ? "Fetching recipe…" : "Fetch recipe details"}</button>
            </div>
          )}

          {photos.length > 0 && <div className={styles.thumbs}>{photos.map((photo, index) => <div key={index} className={styles.thumbBox}><img src={photo.preview} alt="" className={styles.thumb} /><button type="button" className={styles.removeBtn} onClick={() => setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))} aria-label="Remove photo">×</button></div>)}</div>}

          <details className={styles.details} open={scanned}>
            <summary>Ingredients and method <span>Optional</span></summary>
            <div className={styles.detailsBody}>
              <label className={styles.label}>Ingredients<textarea className={`input ${styles.textarea}`} rows={5} value={ingredients} onChange={(event) => setIngredients(event.target.value)} placeholder={"One per line\ne.g. 800g potatoes"} /><VoiceDictation onTranscript={(text) => setIngredients((current) => `${current}${current ? "\n" : ""}${text}`)} /></label>
              <label className={styles.label}>Method<textarea className={`input ${styles.textarea}`} rows={7} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Add the steps whenever you have them." /><VoiceDictation onTranscript={(text) => setInstructions((current) => `${current}${current ? "\n" : ""}${text}`)} /></label>
            </div>
          </details>

          <details className={styles.details}>
            <summary>Make it yours <span>Optional</span></summary>
            <div className={styles.detailsBody}>
              <label className={styles.label}>Notes<textarea className={`input ${styles.textarea}`} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Tweaks, serving ideas, who liked it…" /><VoiceDictation onTranscript={(text) => setNotes((current) => `${current}${current ? " " : ""}${text}`)} /></label>
              <label className={styles.label}>Tags<input className="input" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="quick, winter, veggie" /></label>
              {entryMode !== "link" && <div className={styles.linkField}><label className={styles.label}>Source link<input className="input" type="url" value={links[0] ?? ""} onChange={(event) => setLinks([event.target.value])} placeholder="https://…" /></label></div>}
              <div className={styles.provenance}><span className={styles.provenanceLabel}>Where did this recipe begin?</span><div className={styles.sourceRow}><button type="button" className={`${styles.sourcePill} ${source === "personal" ? styles.sourceActive : ""}`} onClick={() => setSource("personal")}>My own recipe</button><button type="button" className={`${styles.sourcePill} ${source === "book" ? styles.sourceActive : ""}`} onClick={() => setSource("book")}>From a cookbook</button><button type="button" className={`${styles.sourcePill} ${source === "hybrid" ? styles.sourceActive : ""}`} onClick={() => setSource("hybrid")}>Adapted from a cookbook</button></div></div>
              {source !== "personal" && <><p className={styles.sourceHelp}>{source === "hybrid" ? "Keep the original book and page, then make the recipe entirely your own." : "Link this recipe to the book page it came from."}</p><div className={styles.bookRow}><label className={styles.label}>Book<select className="input" value={bookId} onChange={(event) => setBookId(event.target.value)}><option value="">Choose a book…</option>{books.map((book) => <option key={book.id} value={book.id}>{book.title}{book.author ? ` — ${book.author}` : ""}</option>)}</select></label><label className={styles.label}>Page<input className="input" inputMode="numeric" value={pageRef} onChange={(event) => setPageRef(event.target.value)} placeholder="118" /></label></div></>}
              <label className={styles.label}>Who can see this?<select className="input" value={visibility} onChange={(event) => setVisibility(event.target.value as "private" | "household")}><option value="household">Everyone in my kitchen</option><option value="private">Only me</option></select></label>
            </div>
          </details>

          <input ref={photoCameraRef} type="file" accept="image/*" capture="environment" multiple className={styles.fileInput} onChange={(event) => addPhotos(event.target.files)} />
          <input ref={photoLibraryRef} type="file" accept="image/*" multiple className={styles.fileInput} onChange={(event) => addPhotos(event.target.files)} />
          <div className={styles.photoActions}><button type="button" className={styles.addPhotoButton} onClick={() => photoCameraRef.current?.click()} disabled={busy || photos.length >= 6}>📷 {photos.length ? "Take another photo" : "Take a photo"}</button><button type="button" className={styles.addPhotoButton} onClick={() => photoLibraryRef.current?.click()} disabled={busy || photos.length >= 6}>🖼 Choose from library</button></div>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : scanned ? "Save recipe" : "Save to kitchen"}</button>
        </section>
      )}
    </div>
  );
}
