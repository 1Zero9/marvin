import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";
import { visibleTo } from "@/lib/privacy";
import { bookCoverMediaUrl } from "@/lib/media";
import KitchenTabs from "@/components/KitchenTabs";
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
        <img src={bookCoverMediaUrl(book)!} alt="" className={styles.cover} />
      ) : (
        <div className={styles.coverFallback}>{book.title.slice(0, 1)}</div>
      )}
      <div className={styles.info}>
        <h2 className={styles.bookTitle}>
          {book.title}
          {book.favourite && <span className={styles.heart}> ♥</span>}
        </h2>
        {book.author && <p className={styles.author}>{book.author}</p>}
        <p className={styles.indexMeta}>
          {book._count.indexEntries > 0
            ? `${book._count.indexEntries} dishes indexed`
            : "Not indexed yet"}
        </p>
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
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>Kitchen library</p>
          <h1 className={styles.title}>Your cookbooks</h1>
          <p className={styles.sub}>The book shelf that sits alongside your saved recipes.</p>
        </div>
        <Link href="/books/add" className={styles.addLink}>
          + Add a book
        </Link>
      </div>
      <KitchenTabs active="books" />

      {active.length === 0 && archived.length === 0 ? (
        <div className={`card ${styles.empty}`}>
          <h2>Your first shelf is waiting</h2>
          <p>Scan a barcode or add a cookbook to make its recipes easy to find.</p>
          <Link href="/books/add" className="btn btn-primary">Add a book</Link>
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
