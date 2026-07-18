import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";
import { visibleTo } from "@/lib/privacy";
import styles from "./log.module.css";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; rating?: string; book?: string };

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q, rating, book } = await searchParams;
  const identity = await requireHousehold();
  const query = q?.trim() ?? "";
  const ratingFilter = Number(rating);
  const selectedRating = Number.isInteger(ratingFilter) && ratingFilter >= 1 && ratingFilter <= 5
    ? ratingFilter
    : undefined;

  const [logs, books] = await Promise.all([
    prisma.cookLog.findMany({
      where: {
        ...(selectedRating ? { rating: selectedRating } : {}),
        recipe: {
          householdId: identity.membership.householdId,
          ...visibleTo(identity),
          ...(query
            ? { title: { contains: query, mode: "insensitive" } }
            : {}),
          ...(book === "personal" ? { bookId: null } : book ? { bookId: book } : {}),
        },
      },
      include: {
        recipe: {
          include: {
            book: { select: { title: true } },
            photos: { take: 1, orderBy: { createdAt: "asc" } },
          },
        },
        photos: { take: 1, orderBy: { createdAt: "asc" } },
      },
      orderBy: { cookedAt: "desc" },
    }),
    prisma.book.findMany({
      where: { archived: false },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const cookedThisMonth = logs.filter((log) => log.cookedAt >= monthStart).length;
  const recipeCounts = new Map<string, { title: string; count: number }>();
  const ratings = new Map<string, { total: number; count: number; title: string }>();

  for (const log of logs) {
    const existing = recipeCounts.get(log.recipeId);
    recipeCounts.set(log.recipeId, {
      title: log.recipe.title,
      count: (existing?.count ?? 0) + 1,
    });
    if (log.rating != null) {
      const current = ratings.get(log.recipeId);
      ratings.set(log.recipeId, {
        title: log.recipe.title,
        total: (current?.total ?? 0) + log.rating,
        count: (current?.count ?? 0) + 1,
      });
    }
  }

  const mostCooked = [...recipeCounts.values()].sort((a, b) => b.count - a.count)[0];
  const highestRated = [...ratings.values()]
    .filter((item) => item.count >= 2)
    .sort((a, b) => b.total / b.count - a.total / a.count)[0];

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>Log</h1>
        <Link href="/snap" className={styles.snapLink}>📷 Snap a dinner</Link>
      </div>

      {logs.length > 0 && (
        <section className={styles.summary} aria-label="Cooking summary">
          <div className={`card ${styles.stat}`}>
            <span className={styles.statValue}>{cookedThisMonth}</span>
            <span>cooked this month</span>
          </div>
          <div className={`card ${styles.stat}`}>
            <span className={styles.statValue}>{mostCooked?.title ?? "—"}</span>
            <span>{mostCooked?.count === 1 ? "made once" : `made ${mostCooked?.count} times`}</span>
          </div>
          <div className={`card ${styles.stat}`}>
            <span className={styles.statValue}>{highestRated?.title ?? "—"}</span>
            <span>
              {highestRated
                ? `${(highestRated.total / highestRated.count).toFixed(1)} average rating`
                : "rate a meal twice to see a favourite"}
            </span>
          </div>
        </section>
      )}

      {(logs.length > 0 || query || selectedRating || book) && (
        <form className={styles.filters} action="/log" method="get">
          <input
            className={`input ${styles.search}`}
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Find a meal…"
            aria-label="Find a recipe in your cooking log"
          />
          <details className={styles.moreFilters} open={Boolean(selectedRating || book)}>
            <summary className={styles.moreSummary}>Filters</summary>
            <div className={styles.moreRow}>
              <select className="input" name="rating" defaultValue={selectedRating?.toString() ?? ""} aria-label="Filter by rating">
                <option value="">Any rating</option>
                {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
              </select>
              <select className="input" name="book" defaultValue={book ?? ""} aria-label="Filter by book">
                <option value="">All recipes</option>
                <option value="personal">My own recipes</option>
                {books.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
              <button className="btn btn-secondary" type="submit">Apply</button>
            </div>
          </details>
        </form>
      )}

      {logs.length === 0 ? (
        <section className={`card ${styles.empty}`}>
          <h2>{query || selectedRating || book ? "No cooks match those filters" : "Nothing cooked yet"}</h2>
          <p>
            {query || selectedRating || book
              ? "Try widening your search, or clear the filters."
              : "Log a cook from any recipe, or snap the dinner you just made."}
          </p>
          {!query && !selectedRating && !book && <Link href="/recipes" className="btn btn-primary">Browse recipes</Link>}
        </section>
      ) : (
        <ol className={styles.timeline}>
          {logs.map((log) => {
            const photo = log.photos[0] ?? log.recipe.photos[0];
            return (
              <li key={log.id} className={`card ${styles.entry}`}>
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.url} alt="" className={styles.photo} />
                ) : <div className={styles.photoFallback}>🍽</div>}
                <div className={styles.entryBody}>
                  <div className={styles.entryTop}>
                    <div>
                      <Link href={`/recipes/${log.recipeId}`} className={styles.recipeLink}>{log.recipe.title}</Link>
                      <p className={styles.meta}>{formatDate(log.cookedAt)} · {log.recipe.book?.title ?? "My own recipe"}</p>
                    </div>
                    {log.rating != null && <span className={styles.stars} aria-label={`${log.rating} out of 5 stars`}>{"★".repeat(log.rating)}{"☆".repeat(5 - log.rating)}</span>}
                  </div>
                  {log.notes && <p className={styles.notes}>{log.notes}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
