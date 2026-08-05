"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import styles from "./AuthForm.module.css";
import pkg from "../package.json";
import AuthBrand from "./AuthBrand";

export default function RecoveryForm() {
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(body?.error ?? "Could not send a reset link.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className={`card ${styles.form}`}>
        <AuthBrand />
        <h1 className={styles.title}>Check your email</h1>
        <p className={styles.sub}>If that address is registered with Marvin, a reset link is on its way. It works once and expires in an hour.</p>
        <p className={styles.switch}><Link href="/signin">Back to sign in</Link></p>
        <p className={styles.version}>Marvin v{pkg.version}</p>
      </div>
    );
  }

  return (
    <form className={`card ${styles.form}`} onSubmit={submit}>
      <AuthBrand />
      <h1 className={styles.title}>Forgot your password?</h1>
      <p className={styles.sub}>Enter your email and we&rsquo;ll send you a link to choose a new one.</p>
      {error && <p className={styles.error}>{error}</p>}
      <label className={styles.label}>Email<input className="input" name="email" type="email" required autoComplete="email" /></label>
      <button className="btn btn-primary" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
      <p className={styles.switch}><Link href="/signin">Back to sign in</Link></p>
      <p className={styles.version}>Marvin v{pkg.version}</p>
    </form>
  );
}
