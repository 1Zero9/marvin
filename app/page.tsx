import Link from "next/link";
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

  const [bookCount, entries, matchedRecipes, inspiration] = await Promise.all([
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
    !query
      ? prisma.recipe.findMany({
          where: { householdId: identity.membership.householdId, ...visibleTo(identity) },
          include: {
            book: { select: { title: true } },
            photos: { take: 1, orderBy: { createdAt: "asc" } },
            cookLogs: { select: { cookedAt: true, rating: true }, orderBy: { cookedAt: "desc" }, take: 50 },
          },
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

  const MONTH = 30 * 24 * 60 * 60 * 1000;
  const suggestions = inspiration
    .map((recipe) => {
      const ratings = recipe.cookLogs.filter((log) => log.rating != null);
      const average = ratings.length
        ? ratings.reduce((sum, log) => sum + (log.rating ?? 0), 0) / ratings.length
        : 0;
      const lastCooked = recipe.cookLogs[0]?.cookedAt.getTime() ?? 0;
      const monthsAgo = lastCooked ? Math.floor((Date.now() - lastCooked) / MONTH) : null;
      const reason =
        average >= 4
          ? `${average.toFixed(1)} ★ house favourite`
          : monthsAgo == null
            ? "Waiting for its first cook"
            : monthsAgo >= 2
              ? `Not made for ${monthsAgo} months`
              : `Cooked ${recipe.cookLogs.length} ${recipe.cookLogs.length === 1 ? "time" : "times"}`;
      return { recipe, average, lastCooked, reason };
    })
    .sort((a, b) => b.average - a.average || a.lastCooked - b.lastCooked)
    .slice(0, 6);

  const firstName = identity.user.displayName.trim().split(/\s+/)[0];

  const lastCookedRecipe = inspiration
    .filter((recipe) => recipe.cookLogs.length > 0)
    .sort(
      (a, b) => b.cookLogs[0].cookedAt.getTime() - a.cookLogs[0].cookedAt.getTime()
    )[0];
  const lastCookedDays = lastCookedRecipe
    ? Math.floor(
        (Date.now() - lastCookedRecipe.cookLogs[0].cookedAt.getTime()) / 86400000
      )
    : null;
  const lastCookedWhen =
    lastCookedDays == null
      ? null
      : lastCookedDays === 0
        ? "today"
        : lastCookedDays === 1
          ? "yesterday"
          : `${lastCookedDays} days ago`;

  const total = entries.length + matchedRecipes.length;

  const filterHref = (value: string) =>
    `/?q=${encodeURIComponent(query)}${value === "all" ? "" : `&f=${value}`}`;

  return (
    <div className={styles.wrap}>
      <section className={styles.hero}>
        <p className={styles.welcome}>Welcome back, {firstName}</p>
        <h1 className={styles.title}>
          What are we <span className={styles.accent}>making?</span>
        </h1>
        <form className={styles.searchForm} action="/" method="get">
          <input
            className={styles.searchInput}
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Try “aubergine” or “Tuesday curry”…"
            autoComplete="off"
          />
          <button type="submit" className={styles.searchBtn}>
            Search
          </button>
        </form>
        <div className={styles.actions}>
          <Link href="/snap" className={styles.snapAction}>
            <span className={styles.actionEmoji}>📷</span>
            <span>
              <strong>Snap what you cooked</strong>
              <small>Marvin logs it for you</small>
            </span>
          </Link>
          <Link href="/decide" className={styles.inspireAction}>
            <span className={styles.actionEmoji}>✨</span>
            <span>
              <strong>Inspire me</strong>
              <small>Let Marvin choose dinner</small>
            </span>
          </Link>
        </div>
        {!query && lastCookedRecipe && (
          <Link href={`/recipes/${lastCookedRecipe.id}`} className={styles.lastCooked}>
            🍳 Last cooked: <strong>{lastCookedRecipe.title}</strong>
            <span className={styles.lastCookedWhen}>{lastCookedWhen}</span>
          </Link>
        )}
      </section>

      {!query && suggestions.length > 0 && (
        <section className={styles.inspo}>
          <div className={styles.inspoHead}>
            <h2 className={styles.inspoTitle}>A little inspiration</h2>
            <Link href="/decide" className={styles.inspoMore}>
              See more →
            </Link>
          </div>
          <div className={styles.inspoRow}>
            {suggestions.map(({ recipe, reason }) => (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className={`card ${styles.inspoCard}`}
              >
                {recipe.photos[0] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={recipe.photos[0].url} alt="" className={styles.inspoPhoto} />
                ) : (
                  <div className={styles.inspoFallback}>🍽</div>
                )}
                <div className={styles.inspoInfo}>
                  <h3 className={styles.inspoDish}>{recipe.title}</h3>
                  <p className={styles.inspoMeta}>{recipe.book?.title ?? "My own recipe"}</p>
                  <span className={styles.inspoReason}>{reason}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

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
      ) : suggestions.length === 0 ? (
        <section>
          <div className={`card ${styles.empty}`}>
            <h2 className={styles.emptyTitle}>Nothing logged yet</h2>
            <p className={styles.emptyText}>
              Cook something tonight and snap it — Marvin will start learning
              your household favourites and suggest them here.
            </p>
            <Link href="/snap" className="btn btn-primary">
              Snap tonight&rsquo;s dinner
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
