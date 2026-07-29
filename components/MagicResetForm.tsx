"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import pkg from "../package.json";
import styles from "./AuthForm.module.css";

export default function MagicResetForm() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setToken(new URLSearchParams(window.location.hash.slice(1)).get("token") ?? ""), []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!token) { setError("This reset link is incomplete. Request a new one."); return; }
    if (password !== confirm) { setError("The two passwords do not match."); return; }
    setBusy(true);
    const res = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
    const body = await res.json().catch(() => null);
    if (!res.ok) { setError(body?.error ?? "Could not reset your password."); setBusy(false); return; }
    window.location.assign("/");
  }
  return <form className={`card ${styles.form}`} onSubmit={submit}><div className={styles.brand}><span>Marvin</span></div><h1 className={styles.title}>Choose a new password</h1><p className={styles.sub}>This secure link works once and expires shortly. It will sign out other Marvin sessions.</p>{error && <p className={styles.error}>{error}</p>}<label className={styles.label}>New password<input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={10} required autoComplete="new-password" /></label><label className={styles.label}>Confirm password<input className="input" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} minLength={10} required autoComplete="new-password" /></label><button className="btn btn-primary" disabled={busy}>{busy ? "Resetting…" : "Set new password"}</button><p className={styles.switch}><Link href="/signin">Back to sign in</Link></p><p className={styles.version}>Marvin v{pkg.version}</p></form>;
}
