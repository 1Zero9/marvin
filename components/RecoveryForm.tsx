"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import styles from "./AuthForm.module.css";
import pkg from "../package.json";

export default function RecoveryForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/recover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    const body = await res.json().catch(() => null);
    if (!res.ok) { setError(body?.error ?? "Could not reset your password."); setBusy(false); return; }
    window.location.assign("/");
  }
  return <form className={`card ${styles.form}`} onSubmit={submit}><div className={styles.brand}><span>Marvin</span></div><h1 className={styles.title}>Reset password</h1><p className={styles.sub}>Enter your email and recovery code, then choose a new password. The code works once.</p>{error && <p className={styles.error}>{error}</p>}<label className={styles.label}>Email<input className="input" name="email" type="email" required autoComplete="email" /></label><label className={styles.label}>Recovery code<input className="input" name="code" required autoComplete="off" autoCapitalize="characters" /></label><label className={styles.label}>New password<input className="input" name="password" type="password" required minLength={10} autoComplete="new-password" /></label><button className="btn btn-primary" disabled={busy}>{busy ? "Resetting…" : "Reset password"}</button><p className={styles.switch}><Link href="/signin">Back to sign in</Link></p><p className={styles.version}>Marvin v{pkg.version}</p></form>;
}
