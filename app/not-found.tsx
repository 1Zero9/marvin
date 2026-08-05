import Link from "next/link";
import styles from "./error.module.css";

export default function NotFoundPage() {
  return (
    <section className={styles.state}>
      <p className={styles.eyebrow}>Page not found</p>
      <h1>That isn&rsquo;t in this kitchen</h1>
      <p>The link may be old, or the item may no longer be available to you.</p>
      <Link className="btn btn-primary" href="/cook">Back to Cook</Link>
    </section>
  );
}
