import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";
import { visibleTo } from "@/lib/privacy";
import { photoMediaUrl } from "@/lib/media";
import type { Prisma } from "@prisma/client";
import styles from "./log.module.css";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; rating?: string; book?: string; p?: string };
const PAGE_SIZE = 50;

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
  const { q, rating, book, p } = await searchParams;
  const identity = await requireHousehold();
  const query = q?.trim().slice(0, 120) ?? "";
  const selectedBook = typeof book === "string" && book.length <= 128 ? book : undefined;
  const ratingFilter = Number(rating);
  const selectedRating = Number.isInteger(ratingFilter) && ratingFilter >= 1 && ratingFilter <= 5
    ? ratingFilter
    : undefined;
  const parsedPage = Number(p);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const logWhere: Prisma.CookLogWhereInput = {
    ...(selectedRating ? { rating: selectedRating } : {}),
    recipe: {
      householdId: identity.membership.householdId,
      ...visibleTo(identity),
      ...(query ? { title: { contains: query, mode: "insensitive" as const } } : {}),
      ...(selectedBook === "personal" ? { bookId: null } : selectedBook ? { bookId: selectedBook } : {}),
    },
  };
  const cookedWhere: Prisma.CookLogWhereInput = { ...logWhere, countsAsCooked: true };
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [logRows, books, cookedThisMonth, mostCookedGroups, ratingGroups] = await Promise.all([
    prisma.cookLog.findMany({
      where: logWhere,
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
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1,
    }),
    prisma.book.findMany({
      where: { archived: false, householdId: identity.membership.householdId, ...visibleTo(identity) },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.cookLog.count({ where: { ...cookedWhere, cookedAt: { gte: monthStart } } }),
    prisma.cookLog.groupBy({
      by: ["recipeId"],
      where: cookedWhere,
      _count: { recipeId: true },
      orderBy: { _count: { recipeId: "desc" } },
      take: 1,
    }),
    prisma.cookLog.groupBy({
      by: ["recipeId"],
      where: { ...cookedWhere, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
      orderBy: { _avg: { rating: "desc" } },
      take: 20,
    }),
  ]);

  const logs = logRows.slice(0, PAGE_SIZE);
  const hasNextPage = logRows.length > PAGE_SIZE;
  const highestRatedGroup = ratingGroups.find((group) => group._count.rating >= 2);
  const summaryRecipeIds = [...new Set([
    mostCookedGroups[0]?.recipeId,
    highestRatedGroup?.recipeId,
  ].filter((id): id is string => Boolean(id)))];
  const summaryRecipes = summaryRecipeIds.length
    ? await prisma.recipe.findMany({ where: { id: { in: summaryRecipeIds } }, select: { id: true, title: true } })
    : [];
  const titleFor = (recipeId: string | undefined) => summaryRecipes.find((recipe) => recipe.id === recipeId)?.title;
  const mostCooked = mostCookedGroups[0]
    ? { title: titleFor(mostCookedGroups[0].recipeId) ?? "—", count: mostCookedGroups[0]._count.recipeId }
    : undefined;
  const highestRated = highestRatedGroup
    ? { title: titleFor(highestRatedGroup.recipeId) ?? "—", average: highestRatedGroup._avg.rating ?? 0 }
    : undefined;
  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (selectedRating) params.set("rating", String(selectedRating));
    if (selectedBook) params.set("book", selectedBook);
    if (targetPage > 1) params.set("p", String(targetPage));
    const search = params.toString();
    return search ? `/log?${search}` : "/log";
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>Shared cooking</p>
          <h1 className={styles.title}>Kitchen history</h1>
          <p className={styles.sub}>The meals you made, the ones everyone loved, and the ones worth changing next time.</p>
        </div>
        <Link href="/log/add" className={styles.snapLink}>＋ Add a meal</Link>
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
                ? `${highestRated.average.toFixed(1)} average rating`
                : "rate a meal twice to see a favourite"}
            </span>
          </div>
        </section>
      )}

      {(logs.length > 0 || query || selectedRating || selectedBook) && (
        <form className={styles.filters} action="/log" method="get">
          <input
            className={`input ${styles.search}`}
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Find a meal…"
            aria-label="Find a recipe in your cooking log"
          />
          <details className={styles.moreFilters} open={Boolean(selectedRating || selectedBook)}>
            <summary className={styles.moreSummary}>Filters</summary>
            <div className={styles.moreRow}>
              <select className="input" name="rating" defaultValue={selectedRating?.toString() ?? ""} aria-label="Filter by rating">
                <option value="">Any rating</option>
                {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
              </select>
              <select className="input" name="book" defaultValue={selectedBook ?? ""} aria-label="Filter by book">
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
          <h2>{query || selectedRating || selectedBook ? "No cooks match those filters" : "Nothing cooked yet"}</h2>
          <p>
            {query || selectedRating || selectedBook
              ? "Try widening your search, or clear the filters."
              : "Add a meal from a photo, a pasted recipe, or a few quick details."}
          </p>
          {!query && !selectedRating && !selectedBook && <Link href="/log/add" className="btn btn-primary">Add a meal</Link>}
        </section>
      ) : (
        <ol className={styles.timeline}>
          {logs.map((log) => {
            const photo = log.photos[0] ?? log.recipe.photos[0];
            return (
              <li key={log.id} className={`card ${styles.entry}`}>
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoMediaUrl(photo)} alt="" className={styles.photo} />
                ) : <div className={styles.photoFallback}>🍽</div>}
                <div className={styles.entryBody}>
                  <div className={styles.entryTop}>
                    <div>
                      <Link href={`/recipes/${log.recipeId}`} className={styles.recipeLink}>{log.recipe.title}</Link>
                      <p className={styles.meta}>{log.countsAsCooked ? formatDate(log.cookedAt) : `Saved food memory · ${formatDate(log.cookedAt)}`} · {log.recipe.book?.title ?? "My own recipe"}</p>
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
      {(page > 1 || hasNextPage) && (
        <nav className={styles.pagination} aria-label="Cooking history pages">
          {page > 1 ? <Link className="btn btn-secondary" href={pageHref(page - 1)}>Previous</Link> : <span />}
          <span>Page {page}</span>
          {hasNextPage ? <Link className="btn btn-secondary" href={pageHref(page + 1)}>Next</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
