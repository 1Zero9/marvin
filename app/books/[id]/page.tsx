import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";
import { canManage, visibleTo } from "@/lib/privacy";
import BookActions from "@/components/BookActions";
import BookCover from "@/components/BookCover";
import styles from "./book.module.css";

export const dynamic = "force-dynamic";
const INDEX_PAGE_SIZE = 100;

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ p?: string; q?: string }>;
}) {
  const { id } = await params;
  const suppliedSearch = await searchParams;
  const indexQuery = typeof suppliedSearch.q === "string" ? suppliedSearch.q.trim().slice(0, 100) : "";
  const identity = await requireHousehold();
  const book = await prisma.book.findUnique({
    where: { id, householdId: identity.membership.householdId, ...visibleTo(identity) },
    include: {
      _count: { select: { indexEntries: true } },
      recipes: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!book) notFound();

  const entryWhere = {
    bookId: book.id,
    ...(indexQuery ? {
      OR: [
        { ingredient: { contains: indexQuery, mode: "insensitive" as const } },
        { dish: { contains: indexQuery, mode: "insensitive" as const } },
      ],
    } : {}),
  };
  const matchingEntries = indexQuery
    ? await prisma.indexEntry.count({ where: entryWhere })
    : book._count.indexEntries;
  const totalPages = Math.max(1, Math.ceil(matchingEntries / INDEX_PAGE_SIZE));
  const requestedPage = Number(suppliedSearch.p);
  const currentPage = Number.isInteger(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, totalPages)
    : 1;
  const indexEntries = matchingEntries
    ? await prisma.indexEntry.findMany({
      where: entryWhere,
      orderBy: [{ ingredient: "asc" }, { page: "asc" }],
      skip: (currentPage - 1) * INDEX_PAGE_SIZE,
      take: INDEX_PAGE_SIZE,
    })
    : [];
  const pageHref = (page: number) => {
    const query = new URLSearchParams();
    if (indexQuery) query.set("q", indexQuery);
    if (page > 1) query.set("p", String(page));
    const suffix = query.toString();
    return `/books/${book.id}${suffix ? `?${suffix}` : ""}`;
  };

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
        <div className={styles.info}>
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
          <span className="tag">{book._count.indexEntries} index entries</span>
        </div>
      </div>

      {canManage(identity, book.createdById) ? (
        <BookActions
          bookId={book.id}
          title={book.title}
          favourite={book.favourite}
          archived={book.archived}
          visibility={book.visibility}
        />
      ) : (
        <p className={styles.sharedNote}>Only the book&rsquo;s creator or a kitchen owner can edit it.</p>
      )}

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

      {book._count.indexEntries === 0 ? (
        <div className={`card ${styles.empty}`}>
          <p style={{ marginBottom: 16 }}>
            No index entries yet for this book.
          </p>
          <Link href={`/books/${book.id}/index`} className="btn btn-primary">
            Photograph its index
          </Link>
        </div>
      ) : (
        <div className={`card ${styles.tableCard}`}>
          <div className={styles.tableActions}>
            <form className={styles.indexSearch} action={`/books/${book.id}`} method="get">
              <label className={styles.indexSearchLabel} htmlFor="index-query">Search this index</label>
              <div className={styles.indexSearchControls}>
                <input id="index-query" className="input" type="search" name="q" defaultValue={indexQuery} maxLength={100} placeholder="Ingredient or dish" />
                <button type="submit" className="btn btn-secondary">Search</button>
              </div>
            </form>
            <Link
              href={`/books/${book.id}/index`}
              className="btn btn-secondary"
            >
              Add index photos
            </Link>
          </div>
          {indexQuery && (
            <p className={styles.resultSummary} aria-live="polite">
              {matchingEntries} result{matchingEntries === 1 ? "" : "s"} for &ldquo;{indexQuery}&rdquo;
              {' '}<Link href={`/books/${book.id}`}>Clear search</Link>
            </p>
          )}
          {indexEntries.length ? <table className={styles.table}>
            <thead>
              <tr>
                <th>Ingredient</th>
                <th>Dish</th>
                <th className={styles.page}>Page</th>
              </tr>
            </thead>
            <tbody>
              {indexEntries.map((e) => (
                <tr key={e.id}>
                  <td className={styles.ingredient}>{e.ingredient}</td>
                  <td>{e.dish}</td>
                  <td className={styles.page}>{e.page}</td>
                </tr>
              ))}
            </tbody>
          </table> : <p className={styles.noResults}>No index entries match that search.</p>}
          {totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Index pages">
              {currentPage > 1
                ? <Link className="btn btn-secondary" href={pageHref(currentPage - 1)}>Previous</Link>
                : <span />}
              <span>Page {currentPage} of {totalPages}</span>
              {currentPage < totalPages
                ? <Link className="btn btn-secondary" href={pageHref(currentPage + 1)}>Next</Link>
                : <span />}
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
