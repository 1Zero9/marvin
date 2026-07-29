"use client";

import { useState } from "react";
import styles from "@/app/account/account.module.css";

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

export function RecoveryCodeControl() {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function create() {
    setError("");
    const res = await fetch("/api/account/recovery-codes", { method: "POST" });
    const body = await res.json().catch(() => null);
    if (!res.ok) { setError(body?.error ?? "Could not create a recovery code."); return; }
    setCode(body.code);
  }
  return <div className={styles.control}><div><strong>Offline recovery code</strong><p>Create one code to reset your password if you are locked out. It is shown once and replaces any old code—save it somewhere secure.</p></div>{code ? <code className={styles.code}>{code}</code> : <button type="button" className="btn btn-secondary" onClick={create}>Create recovery code</button>}{error && <p className={styles.error}>{error}</p>}</div>;
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
