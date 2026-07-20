"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./add.module.css";

type Recipe = { id: string; title: string };
type Photo = { data: string; mimeType: string; preview: string };

async function resizeImage(file: File): Promise<Photo> {
  const url = URL.createObjectURL(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image(); element.onload = () => resolve(element); element.onerror = reject; element.src = url;
  });
  const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  const preview = canvas.toDataURL("image/jpeg", 0.8);
  return { data: preview.split(",")[1], mimeType: "image/jpeg", preview };
}

export default function LogMealForm({ recipes }: { recipes: Recipe[] }) {
  const router = useRouter();
  const photoRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [recipeId, setRecipeId] = useState("");
  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const [paste, setPaste] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(today);
  const [context, setContext] = useState<"home" | "out">("home");
  const [venue, setVenue] = useState("");
  const [link, setLink] = useState("");
  const [tags, setTags] = useState("");
  const [sorting, setSorting] = useState(false);
  const [reading, setReading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choosePhoto(files: FileList | null) {
    if (!files?.[0]) return;
    setError(null);
    let resized: Photo | null = null;
    try { resized = await resizeImage(files[0]); setPhoto(resized); } catch { setError("That photo couldn't be read. Try another one."); }
    if (photoRef.current) photoRef.current.value = "";
    if (resized && !recipeId) await readPhoto(resized);
  }

  async function readPhoto(photo: Photo) {
    setReading(true);
    try {
      const res = await fetch("/api/recipes/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ images: [{ data: photo.data, mimeType: photo.mimeType }] }) });
      const extracted = await res.json();
      if (!res.ok) { setError(typeof extracted?.error === "string" ? extracted.error : "Couldn't read that photo automatically — you can still fill things in."); return; }
      if (extracted.title) setTitle(extracted.title);
      if (extracted.ingredients) setIngredients(extracted.ingredients);
      if (extracted.instructions) setInstructions(extracted.instructions);
      if (extracted.notes) setNotes(extracted.notes);
      if (extracted.tags?.length) setTags(extracted.tags.join(", "));
      if (extracted.ingredients || extracted.instructions) setDetailsOpen(true);
    } catch { setError("Couldn't read that photo automatically — you can still fill things in."); }
    finally { setReading(false); }
  }

  async function sortPaste() {
    if (paste.trim().length < 20) { setError("Paste a little more first."); return; }
    setSorting(true); setError(null);
    try {
      const res = await fetch("/api/recipes/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: paste }) });
      const extracted = await res.json();
      if (!res.ok) throw new Error(extracted?.error);
      if (extracted.title) setTitle(extracted.title);
      if (extracted.ingredients) setIngredients(extracted.ingredients);
      if (extracted.instructions) setInstructions(extracted.instructions);
      if (extracted.tags?.length) setTags(extracted.tags.join(", "));
      setPasteOpen(false);
    } catch { setError("Couldn't turn that into a meal yet. You can still fill it in manually."); }
    finally { setSorting(false); }
  }

  async function save() {
    if (!recipeId && !title.trim()) { setError("Choose a recipe or give the meal a name."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/logs/quick", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        recipeId: recipeId || null, title, ingredients: ingredients.split(/[\n,]/).map((item) => item.trim()).filter(Boolean), instructions,
        rating: rating || null, notes, cookedAt: date, context, venue, link, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean), photo,
      }) });
      if (!res.ok) throw new Error();
      router.push(context === "out" ? "/moments" : "/log"); router.refresh();
    } catch { setError("Couldn't save that meal. Try again."); setSaving(false); }
  }

  return <div className={styles.wrap}>
    <div className={styles.header}><div><h1>Add a meal</h1><p>Make a quick memory now — turn it into a full recipe later.</p></div><Link href="/snap" className="btn btn-secondary">📷 Smart Snap</Link></div>
    {error && <p className={styles.error}>{error}</p>}
    <section className={`card ${styles.form}`}>
      <div className={styles.context}><button type="button" className={context === "home" ? styles.active : ""} onClick={() => setContext("home")}>🏠 Cooked at home</button><button type="button" className={context === "out" ? styles.active : ""} onClick={() => setContext("out")}>🍽 Out & about</button></div>
      <label>Existing recipe <select className="input" value={recipeId} onChange={(event) => setRecipeId(event.target.value)}><option value="">New meal or memory</option>{recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.title}</option>)}</select></label>
      {!recipeId && <label>What was it?<input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={context === "out" ? "e.g. Smoky prawn tacos" : "e.g. Tuesday night curry"} /></label>}
      {context === "out" && <label>Where?<input className="input" value={venue} onChange={(event) => setVenue(event.target.value)} placeholder="Restaurant, city, market…" /></label>}
      <input ref={photoRef} className={styles.hidden} type="file" accept="image/*" capture="environment" onChange={(event) => choosePhoto(event.target.files)} />
      <div className={styles.photoAction}><button type="button" className="btn btn-secondary" onClick={() => photoRef.current?.click()}>🖼 Add a photo</button>{photo && <><img src={photo.preview} alt="Meal preview" /><button type="button" className={styles.remove} onClick={() => setPhoto(null)}>Remove</button></>}{reading && <span className={styles.reading}>🔎 Reading photo…</span>}</div>
      {!recipeId && <><label>Link <input className="input" type="url" value={link} onChange={(event) => setLink(event.target.value)} placeholder="Instagram, TikTok, article, or recipe link" /></label><button type="button" className={styles.pasteToggle} onClick={() => setPasteOpen((open) => !open)}>📋 {pasteOpen ? "Hide pasted recipe" : "Paste recipe text"}</button>{pasteOpen && <div className={styles.paste}><textarea className="input" rows={6} value={paste} onChange={(event) => setPaste(event.target.value)} placeholder="Paste a recipe, menu description, or a note from your holiday…" /><button type="button" className="btn btn-secondary" disabled={sorting} onClick={sortPaste}>{sorting ? "Sorting…" : "✨ Fill in details"}</button></div>}<details open={detailsOpen} onToggle={(event) => setDetailsOpen(event.currentTarget.open)}><summary>Recipe details (optional)</summary><label>Ingredients<textarea className="input" rows={3} value={ingredients} onChange={(event) => setIngredients(event.target.value)} /></label><label>Method<textarea className="input" rows={4} value={instructions} onChange={(event) => setInstructions(event.target.value)} /></label></details></>}
      <label>Tags <input className="input" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="holiday, tapas, Lisbon" /></label>
      <div className={styles.bottom}><label>When?<input className="input" type="date" max={today} value={date} onChange={(event) => setDate(event.target.value)} /></label><div><span>How was it?</span><div className={styles.stars}>{[1,2,3,4,5].map((number) => <button type="button" key={number} onClick={() => setRating(rating === number ? 0 : number)}>{number <= rating ? "★" : "☆"}</button>)}</div></div></div>
      <label>Notes<textarea className="input" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Who was there? What would you make differently?" /></label>
      <button className="btn btn-primary" type="button" onClick={save} disabled={saving}>{saving ? "Saving…" : context === "out" ? "Save this food memory" : "Save to my log"}</button>
    </section>
  </div>;
}
