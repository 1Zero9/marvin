import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BookActions from "@/components/BookActions";
import BookCover from "@/components/BookCover";
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
    include: {
      indexEntries: { orderBy: [{ ingredient: "asc" }, { page: "asc" }] },
      recipes: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!book) notFound();

  const added = book.createdAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <BookCover
          bookId={book.id}
          coverUrl={book.coverUrl}
          title={book.title}
        />
        <div>
          <h1 className={styles.title}>
            {book.title}
            {book.favourite && <span className={styles.heart}> ♥</span>}
          </h1>
          {book.author && <p className={styles.author}>{book.author}</p>}
          <p className={styles.meta}>
            Added {added}
            {book.pageCount ? ` · ${book.pageCount} pages` : ""}
            {book.archived ? " · Archived" : ""}
          </p>
          <span className="tag">{book.indexEntries.length} index entries</span>
          <BookActions
            bookId={book.id}
            favourite={book.favourite}
            archived={book.archived}
          />
        </div>
      </div>

      {book.recipes.length > 0 && (
        <div className={`card ${styles.recipes}`}>
          <h2 className={styles.sectionTitle}>Recipes from this book</h2>
          <ul className={styles.recipeList}>
            {book.recipes.map((r) => (
              <li key={r.id}>
                <Link href={`/recipes/${r.id}`} className={styles.recipeLink}>
                  {r.title}
                  {r.pageRef ? ` — p.${r.pageRef}` : ""}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

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
