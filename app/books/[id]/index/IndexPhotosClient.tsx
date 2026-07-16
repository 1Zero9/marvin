"use client";

import { useRouter } from "next/navigation";
import IndexExtractor from "@/components/IndexExtractor";
import styles from "./index.module.css";

export default function IndexPhotosClient({
  bookId,
  title,
  existingCount,
}: {
  bookId: string;
  title: string;
  existingCount: number;
}) {
  const router = useRouter();

  function backToBook() {
    router.push(`/books/${bookId}`);
    router.refresh();
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Add index photos</h1>
      <p className={styles.subtitle}>
        {title}
        {existingCount > 0
          ? ` — new entries will be added to the ${existingCount} already saved.`
          : ""}
      </p>
      <IndexExtractor bookId={bookId} onDone={backToBook} onSkip={backToBook} />
    </div>
  );
}
