import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const [bookCount, results] = await Promise.all([
    prisma.book.count(),
    query
      ? prisma.indexEntry.findMany({
          where: {
            OR: [
              { ingredient: { contains: query, mode: "insensitive" } },
              { dish: { contains: query, mode: "insensitive" } },
            ],
            book: { archived: false },
          },
          include: { book: true },
          orderBy: [{ dish: "asc" }],
          take: 100,
        })
      : Promise.resolve([]),
  ]);

  const recipes = query
    ? await prisma.recipe.findMany({
        where: {
          OR: results.map((r) => ({
            bookId: r.bookId,
            pageRef: r.page,
          })),
        },
        select: { id: true, bookId: true, pageRef: true },
      })
    : [];

  const recipeFor = (bookId: string, page: number) =>
    recipes.find((r) => r.bookId === bookId && r.pageRef === page);

  return (
    <div className={styles.wrap}>
      <section className={styles.hero}>
        <h1 className={styles.title}>
          What&rsquo;s in your <span className={styles.accent}>cookbooks?</span>
        </h1>
        <p className={styles.sub}>
          Search every indexed book by ingredient or dish name.
        </p>
        <form className={styles.searchForm} action="/" method="get">
          <input
            className={`input ${styles.searchInput}`}
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Try “aubergine” or “ragu”…"
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
      </section>

      {query ? (
        results.length === 0 ? (
          <div className={`card ${styles.empty}`}>
            <h2 className={styles.emptyTitle}>
              Nothing for &ldquo;{query}&rdquo;
            </h2>
            <p className={styles.emptyText}>
              Try a different ingredient, or index more books.
            </p>
          </div>
        ) : (
          <section className={styles.results}>
            <p className={styles.count}>
              {results.length} result{results.length === 1 ? "" : "s"} for
              &ldquo;{query}&rdquo;
            </p>
            {results.map((r) => {
              const recipe = recipeFor(r.bookId, r.page);
              return (
                <div key={r.id} className={`card ${styles.result}`}>
                  {r.book.coverUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={r.book.coverUrl} alt="" className={styles.resultCover} />
                  ) : (
                    <div className={styles.resultCoverFallback}>
                      {r.book.title.slice(0, 1)}
                    </div>
                  )}
                  <div className={styles.resultInfo}>
                    <h2 className={styles.resultDish}>{r.dish}</h2>
                    <p className={styles.resultMeta}>
                      <Link href={`/books/${r.bookId}`} className={styles.bookLink}>
                        {r.book.title}
                      </Link>{" "}
                      · p.{r.page}
                    </p>
                    <div className={styles.resultTags}>
                      <span className="tag">{r.ingredient}</span>
                      {recipe && (
                        <Link href={`/recipes/${recipe.id}`} className={styles.recipeLink}>
                          View recipe log →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )
      ) : bookCount === 0 ? (
        <section>
          <div className={`card ${styles.empty}`}>
            <h2 className={styles.emptyTitle}>No books indexed yet</h2>
            <p className={styles.emptyText}>
              Scan a cookbook&rsquo;s barcode and photograph its index to make
              it searchable.
            </p>
            <Link href="/books/add" className="btn btn-primary">
              Add your first book
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
