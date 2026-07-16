"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import styles from "./AuthForm.module.css";

export default function AuthForm({ setup = false }: { setup?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const res = await fetch(setup ? "/api/auth/setup" : "/api/auth/signin", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) { setError(body?.error ?? "Something went wrong. Please try again."); setBusy(false); return; }
    router.push("/");
    router.refresh();
  }

  return (
    <form className={`card ${styles.form}`} onSubmit={submit}>
      <div className={styles.brand}><Image src="/icons/icon-192.png" alt="" width={46} height={46} /><span>Marvin</span></div>
      <h1 className={styles.title}>{setup ? "Make Marvin yours" : "Welcome back"}</h1>
      <p className={styles.sub}>{setup ? "Create your private kitchen. You can invite the family afterwards." : "Sign in to your household kitchen."}</p>
      {error && <p className={styles.error}>{error}</p>}
      {setup && <label className={styles.label}>Your name<input className="input" name="displayName" required autoComplete="name" /></label>}
      {setup && <label className={styles.label}>Kitchen name<input className="input" name="householdName" placeholder="e.g. The Cranfield Kitchen" autoComplete="organization" /></label>}
      <label className={styles.label}>Email<input className="input" name="email" type="email" required autoComplete="email" /></label>
      <label className={styles.label}>Password<input className="input" name="password" type="password" required minLength={setup ? 10 : 1} autoComplete={setup ? "new-password" : "current-password"} /></label>
      <button className="btn btn-primary" disabled={busy}>{busy ? "Just a moment…" : setup ? "Create my kitchen" : "Sign in"}</button>
      <p className={styles.switch}>{setup ? <>Already set up? <Link href="/signin">Sign in</Link></> : <>New to this Marvin? <Link href="/setup">Set up your kitchen</Link></>}</p>
    </form>
  );
}
