"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import styles from "./AuthForm.module.css";

export default function JoinForm({ token }: { token: string }) {
  const router = useRouter(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const res = await fetch("/api/invites/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(new FormData(event.currentTarget)), token }) });
    const body = await res.json().catch(() => null);
    if (!res.ok) { setError(body?.error ?? "Could not join this kitchen."); setBusy(false); return; }
    router.push("/"); router.refresh();
  }
  return <form className={`card ${styles.form}`} onSubmit={submit}>
    <h1 className={styles.title}>You&rsquo;re invited</h1><p className={styles.sub}>Join this private Marvin kitchen and add your own food memories.</p>
    {error && <p className={styles.error}>{error}</p>}
    <label className={styles.label}>Your name<input className="input" name="displayName" required autoComplete="name" /></label>
    <label className={styles.label}>Email<input className="input" name="email" type="email" required autoComplete="email" /></label>
    <label className={styles.label}>Password<input className="input" name="password" type="password" minLength={10} required autoComplete="new-password" /></label>
    <button className="btn btn-primary" disabled={busy}>{busy ? "Joining…" : "Join this kitchen"}</button>
  </form>;
}
