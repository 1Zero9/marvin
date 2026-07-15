import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./books.module.css";

export const dynamic = "force-dynamic";

export default async function BooksPage() {
  const books = await prisma.book.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { indexEntries: true } } },
  });

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Your books</h1>
        <Link href="/books/add" className="btn btn-primary">
          Add a book
        </Link>
      </div>

      {books.length === 0 ? (
        <div className={`card ${styles.empty}`}>
          <p>No books yet. Scan a barcode to add your first cookbook.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {books.map((book) => (
            <Link key={book.id} href={`/books/${book.id}`} className={`card ${styles.book}`}>
              {book.coverUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={book.coverUrl} alt="" className={styles.cover} />
              ) : (
                <div className={styles.coverFallback}>{book.title.slice(0, 1)}</div>
              )}
              <div className={styles.info}>
                <h2 className={styles.bookTitle}>{book.title}</h2>
                {book.author && <p className={styles.author}>{book.author}</p>}
                <span className="tag">
                  {book._count.indexEntries} index entries
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
