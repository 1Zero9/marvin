import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";
import { visibleTo } from "@/lib/privacy";
import styles from "./books.module.css";

export const dynamic = "force-dynamic";

type BookCard = {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  favourite: boolean;
  _count: { indexEntries: number };
};

function BookTile({ book }: { book: BookCard }) {
  return (
    <Link href={`/books/${book.id}`} className={`card ${styles.book}`}>
      {book.coverUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={book.coverUrl} alt="" className={styles.cover} />
      ) : (
        <div className={styles.coverFallback}>{book.title.slice(0, 1)}</div>
      )}
      <div className={styles.info}>
        <h2 className={styles.bookTitle}>
          {book.title}
          {book.favourite && <span className={styles.heart}> ♥</span>}
        </h2>
        {book.author && <p className={styles.author}>{book.author}</p>}
        <span className="tag">{book._count.indexEntries} index entries</span>
      </div>
    </Link>
  );
}

export default async function BooksPage() {
  const identity = await requireHousehold();
  const books = await prisma.book.findMany({
    where: { householdId: identity.membership.householdId, ...visibleTo(identity) },
    orderBy: [{ favourite: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { indexEntries: true } } },
  });
  const active = books.filter((b) => !b.archived);
  const archived = books.filter((b) => b.archived);

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Your books</h1>
        <Link href="/books/add" className="btn btn-primary">
          Add a book
        </Link>
      </div>

      {active.length === 0 && archived.length === 0 ? (
        <div className={`card ${styles.empty}`}>
          <p>No books yet. Scan a barcode to add your first cookbook.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {active.map((book) => (
            <BookTile key={book.id} book={book} />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <>
          <h2 className={styles.archivedTitle}>Archived</h2>
          <div className={`${styles.grid} ${styles.archivedGrid}`}>
            {archived.map((book) => (
              <BookTile key={book.id} book={book} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
