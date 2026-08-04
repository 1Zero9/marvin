"use client";

import { useState } from "react";
import styles from "./MemberResetLink.module.css";

export default function MemberResetLink({ membershipId, displayName }: { membershipId: string; displayName: string }) {
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function createLink() {
    setBusy(true);
    setError("");
    setCopied(false);
    const res = await fetch(`/api/admin/members/${membershipId}/reset-link`, { method: "POST" });
    const body = await res.json().catch(() => null);
    if (!res.ok) setError(body?.error ?? "Could not create a reset link.");
    else setLink(body.url);
    setBusy(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
  }

  async function shareLink() {
    if (navigator.share) await navigator.share({ title: "Reset your Marvin password", text: `Use this link to set a new Marvin password, ${displayName}.`, url: link });
    else await copyLink();
  }

  if (!link) {
    return <div className={styles.wrap}>
      <button type="button" className="btn btn-secondary" onClick={createLink} disabled={busy}>{busy ? "Creating…" : "Send reset link"}</button>
      {error && <p className={styles.error}>{error}</p>}
    </div>;
  }

  return <div className={styles.wrap}>
    <label className={styles.link}>One-time reset link for {displayName}<input className="input" value={link} readOnly onFocus={(event) => event.currentTarget.select()} /></label>
    <div className={styles.actions}>
      <button type="button" className="btn btn-secondary" onClick={copyLink}>{copied ? "Copied" : "Copy link"}</button>
      <button type="button" className="btn btn-primary" onClick={shareLink}>Share link</button>
    </div>
    <p className={styles.hint}>Works once and expires in an hour. Send it directly to {displayName} — anyone with the link can set their password.</p>
  </div>;
}
