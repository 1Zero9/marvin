"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import styles from "./AuthForm.module.css";

export default function JoinForm({ token, invitedEmail }: { token: string; invitedEmail?: string | null }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/invites/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(new FormData(event.currentTarget)), token }) });
    const body = await res.json().catch(() => null);
    if (!res.ok) { setError(body?.error ?? "Could not join this kitchen."); setBusy(false); return; }
    router.push("/");
    router.refresh();
  }

  return <form className={`card ${styles.form}`} onSubmit={submit}>
    <h1 className={styles.title}>Create your Marvin account</h1>
    <p className={styles.sub}>You&rsquo;ll join the kitchen as soon as you finish these three fields.</p>
    {error && <p className={styles.error}>{error}</p>}
    <label className={styles.label}>Your name<input className="input" name="displayName" required autoComplete="name" autoFocus /></label>
    <label className={styles.label}>Email<input className="input" name="email" type="email" required autoComplete="email" defaultValue={invitedEmail ?? ""} readOnly={Boolean(invitedEmail)} /></label>
    <label className={styles.label}>Choose a password<input className="input" name="password" type="password" minLength={10} required autoComplete="new-password" /></label>
    <button className="btn btn-primary" disabled={busy}>{busy ? "Creating your account…" : "Create account & join"}</button>
  </form>;
}
