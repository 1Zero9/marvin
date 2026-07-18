import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";
import { visibleTo } from "@/lib/privacy";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; f?: string }>;
}) {
  const { q, f } = await searchParams;
  const identity = await requireHousehold();
  const query = q?.trim() ?? "";
  const filter = f === "books" || f === "personal" ? f : "all";

  const [bookCount, entries, matchedRecipes] = await Promise.all([
    prisma.book.count({ where: { householdId: identity.membership.householdId, ...visibleTo(identity) } }),
    query && filter !== "personal"
      ? prisma.indexEntry.findMany({
          where: {
            OR: [
              { ingredient: { contains: query, mode: "insensitive" } },
              { dish: { contains: query, mode: "insensitive" } },
            ],
            book: { archived: false, householdId: identity.membership.householdId, ...visibleTo(identity) },
          },
          include: { book: true },
          orderBy: [{ dish: "asc" }],
          take: 100,
        })
      : Promise.resolve([]),
    query
      ? prisma.recipe.findMany({
          where: {
            AND: [
              {
                OR: [
                  { title: { contains: query, mode: "insensitive" } },
                  { keywords: { has: query.toLowerCase() } },
                  { tags: { has: query.toLowerCase() } },
                ],
              },
              filter === "books"
                ? { source: "book" }
                : filter === "personal"
                  ? { source: "personal" }
                  : {},
              { householdId: identity.membership.householdId },
              visibleTo(identity),
            ],
          },
          include: {
            book: { select: { id: true, title: true } },
            photos: { take: 1, orderBy: { createdAt: "asc" } },
          },
          orderBy: { title: "asc" },
          take: 50,
        })
      : Promise.resolve([]),
  ]);

  const entryRecipes = query
    ? await prisma.recipe.findMany({
        where: {
          AND: [{ householdId: identity.membership.householdId }, visibleTo(identity), { OR:
            entries.length > 0
              ? entries.map((r) => ({ bookId: r.bookId, pageRef: r.page }))
              : [{ id: "none" }] }],
        },
        select: { id: true, bookId: true, pageRef: true },
      })
    : [];

  const recipeFor = (bookId: string, page: number) =>
    entryRecipes.find((r) => r.bookId === bookId && r.pageRef === page);

  const firstName = identity.user.displayName.trim().split(/\s+/)[0];

  const total = entries.length + matchedRecipes.length;

  const filterHref = (value: string) =>
    `/?q=${encodeURIComponent(query)}${value === "all" ? "" : `&f=${value}`}`;

  return (
    <div className={styles.wrap}>
      <section className={`${styles.hero} ${query ? styles.heroCompact : ""}`}>
        <div className={styles.logoLockup}>
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={96}
            height={96}
            className={styles.heroLogo}
            priority
          />
          <h1 className={styles.heroName}>Marvin</h1>
        </div>
        {!query && (
          <p className={styles.tagline}>
            What are we <span className={styles.accent}>making</span>, {firstName}?
          </p>
        )}
        <form className={styles.searchForm} action="/" method="get">
          <div className={styles.searchBox}>
            <span className={styles.searchIcon} aria-hidden="true">🔍</span>
            <input
              className={styles.searchInput}
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Try “aubergine” or “Tuesday curry”…"
              autoComplete="off"
            />
          </div>
          <div className={styles.searchButtons}>
            <button type="submit" className={styles.searchBtn}>
              Search
            </button>
            <Link href="/decide" className={styles.inspireBtn}>
              ✨ Inspire me
            </Link>
          </div>
        </form>
        {!query && (
          <Link href="/snap" className={styles.snapPill}>
            📷 Snap what you cooked
          </Link>
        )}
      </section>

      {query ? (
        <>
          <div className={styles.filterRow}>
            {[
              { value: "all", label: "All" },
              { value: "books", label: "From books" },
              { value: "personal", label: "My recipes" },
            ].map((opt) => (
              <Link
                key={opt.value}
                href={filterHref(opt.value)}
                className={`${styles.filterPill} ${
                  filter === opt.value ? styles.filterActive : ""
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>

          {total === 0 ? (
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
                {total} result{total === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
              </p>

              {matchedRecipes.map((r) => (
                <Link
                  key={`recipe-${r.id}`}
                  href={`/recipes/${r.id}`}
                  className={`card ${styles.result}`}
                >
                  {r.photos[0] ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={r.photos[0].url}
                      alt=""
                      className={styles.resultCover}
                    />
                  ) : (
                    <div className={styles.resultCoverFallback}>🍽</div>
                  )}
                  <div className={styles.resultInfo}>
                    <h2 className={styles.resultDish}>{r.title}</h2>
                    <p className={styles.resultMeta}>
                      {r.book
                        ? `${r.book.title}${r.pageRef ? ` · p.${r.pageRef}` : ""}`
                        : "My own recipe"}
                    </p>
                    <div className={styles.resultTags}>
                      <span className="tag">
                        {r.source === "book" ? "Book recipe" : "Personal"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}

              {entries.map((r) => {
                const recipe = recipeFor(r.bookId, r.page);
                return (
                  <div key={r.id} className={`card ${styles.result}`}>
                    {r.book.coverUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={r.book.coverUrl}
                        alt=""
                        className={styles.resultCover}
                      />
                    ) : (
                      <div className={styles.resultCoverFallback}>
                        {r.book.title.slice(0, 1)}
                      </div>
                    )}
                    <div className={styles.resultInfo}>
                      <h2 className={styles.resultDish}>{r.dish}</h2>
                      <p className={styles.resultMeta}>
                        <Link
                          href={`/books/${r.bookId}`}
                          className={styles.bookLink}
                        >
                          {r.book.title}
                        </Link>{" "}
                        · p.{r.page}
                      </p>
                      <div className={styles.resultTags}>
                        <span className="tag">{r.ingredient}</span>
                        {recipe && (
                          <Link
                            href={`/recipes/${recipe.id}`}
                            className={styles.recipeLink}
                          >
                            View recipe log →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </>
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
