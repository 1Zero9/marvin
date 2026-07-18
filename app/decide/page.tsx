import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";
import { visibleTo } from "@/lib/privacy";
import styles from "./decide.module.css";

export const dynamic = "force-dynamic";

type Filter = "all" | "quick" | "rated" | "return" | "book" | "personal";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All ideas" },
  { value: "quick", label: "Quick" },
  { value: "rated", label: "Highly rated" },
  { value: "return", label: "Not made lately" },
  { value: "book", label: "From books" },
  { value: "personal", label: "My recipes" },
];

function seasonalFit(tags: string[]) {
  const month = new Date().getMonth() + 1;
  const winter = month === 11 || month === 12 || month <= 2;
  const outdoors = month >= 5 && month <= 9;
  const has = (values: string[]) => values.some((value) => tags.includes(value));
  if (winter && has(["winter", "comfort", "warming"])) return "A good fit for colder evenings";
  if (outdoors && has(["outdoors", "outdoor", "bbq", "barbecue", "summer"])) return "A good fit for eating outside";
  if (!winter && has(["spring", "summer", "light"])) return "A good fit for this time of year";
  return null;
}

function reasonFor(recipe: { cookLogs: { cookedAt: Date; rating: number | null }[]; tags: string[] }) {
  const seasonal = seasonalFit(recipe.tags);
  if (seasonal) return seasonal;
  const ratings = recipe.cookLogs.filter((log) => log.rating != null);
  const average = ratings.length
    ? ratings.reduce((sum, log) => sum + (log.rating ?? 0), 0) / ratings.length
    : null;
  const lastCooked = recipe.cookLogs[0]?.cookedAt;
  if (average && average >= 4) return `${average.toFixed(1)} ★ from your past cooks`;
  if (!lastCooked) return "Waiting for its first cook";
  const months = Math.floor((Date.now() - lastCooked.getTime()) / (30 * 24 * 60 * 60 * 1000));
  if (months >= 2) return `Not made for ${months} months`;
  if (recipe.tags.includes("quick")) return "Tagged quick";
  return `Cooked ${recipe.cookLogs.length} ${recipe.cookLogs.length === 1 ? "time" : "times"}`;
}

export default async function DecidePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: rawFilter } = await searchParams;
  const identity = await requireHousehold();
  const filter = filters.some((item) => item.value === rawFilter)
    ? (rawFilter as Filter)
    : "all";

  const [recipes, shelfEntries, bookRecipeRefs] = await Promise.all([prisma.recipe.findMany({
    where: {
      householdId: identity.membership.householdId,
      ...visibleTo(identity),
      ...(filter === "quick" ? { tags: { has: "quick" } } : {}),
      ...(filter === "book" ? { source: "book" } : {}),
      ...(filter === "personal" ? { source: "personal" } : {}),
    },
    include: {
      book: { select: { title: true } },
      photos: { take: 1, orderBy: { createdAt: "asc" } },
      cookLogs: { select: { cookedAt: true, rating: true }, orderBy: { cookedAt: "desc" }, take: 50 },
    },
  }), prisma.indexEntry.findMany({
    where: { book: { householdId: identity.membership.householdId, archived: false, ...visibleTo(identity) } },
    include: { book: { select: { id: true, title: true, coverUrl: true } } },
    orderBy: { dish: "asc" },
    take: 100,
  }), prisma.recipe.findMany({ where: { householdId: identity.membership.householdId, ...visibleTo(identity), bookId: { not: null }, pageRef: { not: null } }, select: { bookId: true, pageRef: true } })]);

  const scored = recipes
    .map((recipe) => {
      const ratings = recipe.cookLogs.filter((log) => log.rating != null);
      const average = ratings.length
        ? ratings.reduce((sum, log) => sum + (log.rating ?? 0), 0) / ratings.length
        : 0;
      const lastCooked = recipe.cookLogs[0]?.cookedAt.getTime() ?? 0;
      return { recipe, average, lastCooked };
    })
    .filter((item) => filter !== "rated" || item.average >= 4)
    .sort((a, b) => {
      if (filter === "return") return a.lastCooked - b.lastCooked;
      if (filter === "rated") return b.average - a.average;
      const seasonalA = seasonalFit(a.recipe.tags) ? 1 : 0;
      const seasonalB = seasonalFit(b.recipe.tags) ? 1 : 0;
      return seasonalB - seasonalA || b.average - a.average || a.lastCooked - b.lastCooked || a.recipe.title.localeCompare(b.recipe.title);
    });

  const dailyPick = scored.length
    ? scored[new Date().getDate() % scored.length].recipe
    : null;
  const triedPages = new Set(bookRecipeRefs.map((recipe) => `${recipe.bookId}:${recipe.pageRef}`));
  const shelfPick = shelfEntries.find((entry) => !triedPages.has(`${entry.bookId}:${entry.page}`));

  return (
    <div className={styles.wrap}>
      <section className={styles.hero}>
        <h1 className={styles.title}>What should we cook?</h1>
      </section>

      {dailyPick && (
        <section className={`card ${styles.pick}`}>
          <p className={styles.eyebrow}>Tonight&rsquo;s Marvin pick</p>
          <div className={styles.pickBody}>
            {dailyPick.photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dailyPick.photos[0].url} alt="" className={styles.pickPhoto} />
            ) : <div className={styles.pickFallback}>🍽</div>}
            <div>
              <h2 className={styles.pickTitle}>{dailyPick.title}</h2>
              <p className={styles.pickReason}>{reasonFor(dailyPick)}</p>
              <Link href={`/recipes/${dailyPick.id}`} className="btn btn-primary">Make this</Link>
            </div>
          </div>
        </section>
      )}

      {shelfPick && (
        <Link href={`/books/${shelfPick.book.id}`} className={styles.shelfLine}>
          Something new: <strong>{shelfPick.dish}</strong> · {shelfPick.book.title}, p.{shelfPick.page} →
        </Link>
      )}

      <nav className={styles.filters} aria-label="Recipe suggestions">
        {filters.map((item) => (
          <Link
            key={item.value}
            href={item.value === "all" ? "/decide" : `/decide?filter=${item.value}`}
            className={`${styles.filter} ${filter === item.value ? styles.active : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {scored.length === 0 ? (
        <section className={`card ${styles.empty}`}>
          <h2>No suggestions here yet</h2>
          <p>{filter === "quick" ? "Add the tag “quick” to recipes for an easy weekday shortlist." : "Add a recipe or log a cook and Marvin will start finding patterns."}</p>
          <Link href="/recipes/add" className="btn btn-primary">Add a recipe</Link>
        </section>
      ) : (
        <section className={styles.grid}>
          {scored.map(({ recipe }) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`} className={`card ${styles.recipe}`}>
              {recipe.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={recipe.photos[0].url} alt="" className={styles.photo} />
              ) : <div className={styles.photoFallback}>🍽</div>}
              <div className={styles.recipeInfo}>
                <h2 className={styles.recipeTitle}>{recipe.title}</h2>
                <p className={styles.meta}>{recipe.book?.title ?? "My own recipe"}</p>
                <span className={styles.reason}>{reasonFor(recipe)}</span>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
