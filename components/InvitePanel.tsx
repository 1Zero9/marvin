"use client";
import { useState } from "react";
import styles from "./InvitePanel.module.css";
export default function InvitePanel() {
  const [email, setEmail] = useState(""); const [link, setLink] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function createInvite() { setBusy(true); setError(""); const res = await fetch("/api/invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }); const body = await res.json().catch(() => null); if (!res.ok) setError(body?.error ?? "Could not create an invitation."); else setLink(body.invite.url); setBusy(false); }
  return <section className={`card ${styles.wrap}`}><h2>Invite someone</h2><p>Make a private 14-day invitation link for family or friends.</p><div className={styles.row}><input className="input" value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Optional: their email" /><button type="button" className="btn btn-primary" onClick={createInvite} disabled={busy}>{busy ? "Creating…" : "Create link"}</button></div>{error && <p className={styles.error}>{error}</p>}{link && <label className={styles.link}>Share this link<input className="input" value={link} readOnly onFocus={(event) => event.currentTarget.select()} /></label>}</section>;
}
