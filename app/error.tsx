"use client";

import Link from "next/link";
import styles from "./error.module.css";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className={styles.state} role="alert">
      <p className={styles.eyebrow}>Something went wrong</p>
      <h1>Marvin hit a snag</h1>
      <p>Your data is still safe. Try this page again, or return to the kitchen.</p>
      <div className={styles.actions}>
        <button className="btn btn-primary" type="button" onClick={reset}>Try again</button>
        <Link className="btn btn-secondary" href="/cook">Back to Cook</Link>
      </div>
      {error.digest && <p className={styles.reference}>Reference: {error.digest}</p>}
    </section>
  );
}
