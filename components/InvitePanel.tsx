"use client";

import { useState } from "react";
import styles from "./InvitePanel.module.css";

export default function InvitePanel() {
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function createInvite() {
    setBusy(true);
    setError("");
    setCopied(false);
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) setError(body?.error ?? "Could not create an invitation.");
    else setLink(body.invite.url);
    setBusy(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
  }

  async function shareLink() {
    if (navigator.share) await navigator.share({ title: "Join my Marvin kitchen", text: "Create your Marvin account and join my kitchen.", url: link });
    else await copyLink();
  }

  return <section className={`card ${styles.wrap}`}>
    <h2>Add someone to your kitchen</h2>
    <p>Enter their email, then send the invitation link. They create their own account in one short step.</p>
    <div className={styles.row}>
      <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Their email address" autoComplete="email" />
      <button type="button" className="btn btn-primary" onClick={createInvite} disabled={busy}>{busy ? "Creating…" : "Create invitation"}</button>
    </div>
    {error && <p className={styles.error}>{error}</p>}
    {link && <div className={styles.invitation}>
      <label className={styles.link}>Invitation link<input className="input" value={link} readOnly onFocus={(event) => event.currentTarget.select()} /></label>
      <div className={styles.actions}><button type="button" className="btn btn-secondary" onClick={copyLink}>{copied ? "Copied" : "Copy link"}</button><button type="button" className="btn btn-primary" onClick={shareLink}>Share invitation</button></div>
    </div>}
    <p className={styles.hint}>She should open the link while signed out, preferably on her own device or in a private window.</p>
  </section>;
}
