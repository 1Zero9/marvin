"use client";

import { FormEvent, useState } from "react";
import styles from "@/app/account/account.module.css";

const FISH_AND_SEAFOOD = "fish-and-seafood";

export function AiProcessingControl({ enabled }: { enabled: boolean }) {
  const [value, setValue] = useState(enabled);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  async function toggle() {
    setSaving(true); setMessage("");
    const next = !value;
    const res = await fetch("/api/account/privacy", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aiProcessingEnabled: next }) });
    if (res.ok) { setValue(next); setMessage(next ? "AI processing is enabled." : "AI processing is off. Marvin will not send your content to Gemini."); }
    else setMessage("That setting could not be saved. Please try again.");
    setSaving(false);
  }
  return <div className={styles.control}><div><strong>Optional AI help</strong><p>When enabled, only actions you choose—such as recipe reading or swap suggestions—may send the relevant recipe text or image to Gemini. Health, reflections, and daily tracking are never sent.</p></div><button type="button" className="btn btn-secondary" onClick={toggle} disabled={saving}>{saving ? "Saving…" : value ? "Turn off AI" : "Turn on AI"}</button>{message && <p className={styles.status}>{message}</p>}</div>;
}

export function FoodPreferencesControl({ exclusions }: { exclusions: string[] }) {
  const [items, setItems] = useState(exclusions);
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  async function save(next: string[]) {
    setSaving(true); setMessage("");
    const response = await fetch("/api/account/food-preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ foodExclusions: next }) });
    const body = await response.json().catch(() => null);
    if (response.ok) { setItems(body.foodExclusions); setMessage("Your food preferences are saved."); }
    else setMessage("That preference could not be saved. Please try again.");
    setSaving(false);
  }
  function toggleFish() {
    save(items.includes(FISH_AND_SEAFOOD) ? items.filter((item) => item !== FISH_AND_SEAFOOD) : [...items, FISH_AND_SEAFOOD]);
  }
  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = newItem.trim().toLowerCase();
    if (next.length < 2) { setMessage("Add at least two letters for a food or ingredient."); return; }
    if (items.some((item) => item.toLowerCase() === next)) { setMessage("That food is already on your list."); return; }
    setNewItem("");
    save([...items, next]);
  }
  function label(item: string) { return item === FISH_AND_SEAFOOD ? "Fish & seafood" : item; }
  return <div className={styles.foodControl}><div><strong>Foods to leave out</strong><p>Add anything you don&rsquo;t eat. Marvin filters matching recipes from your personal browsing, search, and suggestions.</p></div><button type="button" className={`btn ${items.includes(FISH_AND_SEAFOOD) ? "btn-primary" : "btn-secondary"}`} onClick={toggleFish} disabled={saving}>{items.includes(FISH_AND_SEAFOOD) ? "Fish & seafood excluded" : "Exclude fish & seafood"}</button>{items.length > 0 && <div className={styles.foodChips}>{items.map((item) => <span key={item} className={styles.foodChip}>{label(item)}<button type="button" onClick={() => save(items.filter((value) => value !== item))} disabled={saving} aria-label={`Include ${label(item)} again`}>×</button></span>)}</div>}<form className={styles.foodForm} onSubmit={add}><label className={styles.srOnly} htmlFor="food-preference">Food or ingredient to avoid</label><input id="food-preference" className="input" value={newItem} maxLength={60} onChange={(event) => setNewItem(event.target.value)} placeholder="e.g. mushrooms, pork, coriander" /><button className="btn btn-secondary" disabled={saving || !newItem.trim()}>Add food</button></form><p className={styles.foodSafety}>This is a personal filtering aid, not an allergy-safety guarantee. Always check ingredients yourself.</p>{message && <p className={styles.status}>{message}</p>}</div>;
}

export function DailyCompanionControl({ enabled }: { enabled: boolean }) {
  const [value, setValue] = useState(enabled);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  async function toggle() {
    const next = !value;
    setSaving(true); setMessage("");
    const response = await fetch("/api/account/daily-companion", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ showDailyCompanion: next }) });
    if (response.ok) {
      setValue(next);
      window.dispatchEvent(new CustomEvent("marvin:daily-companion", { detail: next }));
      setMessage(next ? "My Day is back in your navigation." : "My Day is hidden. Your private data has not been deleted.");
    } else setMessage("That setting could not be saved. Please try again.");
    setSaving(false);
  }
  return <div className={styles.control}><div><strong>Show My Day</strong><p>Turn this off to hide My Day from the app and open Cook instead.</p></div><button type="button" className={`btn ${value ? "btn-primary" : "btn-secondary"}`} onClick={toggle} disabled={saving}>{saving ? "Saving…" : value ? "Shown" : "Hidden"}</button>{message && <p className={styles.status}>{message}</p>}</div>;
}

export function DeleteAccountControl() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  async function remove() {
    setDeleting(true); setError("");
    const res = await fetch("/api/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, confirmation }) });
    const body = await res.json().catch(() => null);
    if (!res.ok) { setError(body?.error ?? "Could not delete the account."); setDeleting(false); return; }
    window.location.assign("/setup");
  }
  return <div className={`${styles.control} ${styles.danger}`}><div><strong>Delete my account</strong><p>This permanently removes your account, private tracking, sessions, recovery codes, and data in any kitchen where you are the only member. In a shared kitchen, shared recipes stay but are anonymised; your private records are removed.</p></div>{!open ? <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>Delete my account</button> : <div className={styles.deleteForm}><label>Current password<input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label><label>Type DELETE MY ACCOUNT<input className="input" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><button type="button" className="btn btn-secondary" disabled={deleting} onClick={remove}>{deleting ? "Deleting…" : "Permanently delete account"}</button>{error && <p className={styles.error}>{error}</p>}</div>}</div>;
}
