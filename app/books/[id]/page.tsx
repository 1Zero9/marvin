import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import styles from "./book.module.css";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const book = await prisma.book.findUnique({
    where: { id },
    include: { indexEntries: { orderBy: [{ ingredient: "asc" }, { page: "asc" }] } },
  });
  if (!book) notFound();

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        {book.coverUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={book.coverUrl} alt="" className={styles.cover} />
        ) : null}
        <div>
          <h1 className={styles.title}>{book.title}</h1>
          {book.author && <p className={styles.author}>{book.author}</p>}
          <span className="tag">{book.indexEntries.length} index entries</span>
        </div>
      </div>

      {book.indexEntries.length === 0 ? (
        <div className={`card ${styles.empty}`}>
          <p style={{ marginBottom: 16 }}>
            No index entries yet for this book.
          </p>
          <Link href="/books/add" className="btn btn-primary">
            Photograph its index
          </Link>
        </div>
      ) : (
        <div className={`card ${styles.tableCard}`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Ingredient</th>
                <th>Dish</th>
                <th className={styles.page}>Page</th>
              </tr>
            </thead>
            <tbody>
              {book.indexEntries.map((e) => (
                <tr key={e.id}>
                  <td className={styles.ingredient}>{e.ingredient}</td>
                  <td>{e.dish}</td>
                  <td className={styles.page}>{e.page}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
