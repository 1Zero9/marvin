"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function FeaturedImage({ src }: { src: string }) {
  const [errored, setErrored] = useState(false);

  if (errored) return <div className={styles.featuredFallback}>🍲</div>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={styles.featuredImage} onError={() => setErrored(true)} />
  );
}
