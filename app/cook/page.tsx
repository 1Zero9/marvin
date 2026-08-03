import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";
import { visibleTo } from "@/lib/privacy";
import { bookCoverMediaUrl, photoMediaUrl } from "@/lib/media";
import Icon from "@/components/Icon";
import { matchesFoodExclusions, recipeIsExcluded } from "@/lib/foodPreferences";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

function tidyIndexedDish(dish: string, page: number) {
  return dish.replace(new RegExp(`\\s+${page}\\s*$`), "").trim();
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; f?: string }>;
}) {
  const { q, f } = await searchParams;
  const identity = await requireHousehold();
  const query = q?.trim() ?? "";
  const filter = f === "books" || f === "personal" ? f : "all";

  const [bookCount, recipePreferenceRecords, entries, matchedRecipes, featuredRecipes] = await Promise.all([
    prisma.book.count({ where: { householdId: identity.membership.householdId, ...visibleTo(identity) } }),
    prisma.recipe.findMany({
      where: { householdId: identity.membership.householdId, archived: false, ...visibleTo(identity) },
      select: { title: true, ingredients: true, tags: true, keywords: true },
    }),
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
                ? { source: { in: ["book", "hybrid"] } }
                : filter === "personal"
                  ? { source: { in: ["personal", "hybrid"] } }
                  : {},
              { householdId: identity.membership.householdId },
              { archived: false },
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
          where: { householdId: identity.membership.householdId, archived: false, ...visibleTo(identity) },
          include: { photos: { take: 1, orderBy: { createdAt: "desc" } } },
          orderBy: { updatedAt: "desc" },
          take: 12,
        })
      : Promise.resolve([]),
  ]);

  const suitableEntries = entries.filter((entry) => !matchesFoodExclusions([entry.ingredient, entry.dish], identity.user.foodExclusions));
  const groupedEntries = Array.from(
    suitableEntries.reduce((groups, entry) => {
      const key = `${entry.bookId}:${entry.page}`;
      const existing = groups.get(key);
      const dish = tidyIndexedDish(entry.dish, entry.page);
      if (existing) {
        existing.ingredients.add(entry.ingredient);
      } else {
        groups.set(key, { ...entry, dish, ingredients: new Set([entry.ingredient]) });
      }
      return groups;
    }, new Map<string, { id: string; bookId: string; book: typeof entries[number]["book"]; page: number; dish: string; ingredients: Set<string> }>()).values()
  );
  const suitableRecipes = matchedRecipes.filter((recipe) => !recipeIsExcluded(recipe, identity.user.foodExclusions));
  const recipeCount = recipePreferenceRecords.filter((recipe) => !recipeIsExcluded(recipe, identity.user.foodExclusions)).length;
  const featuredRecipe = featuredRecipes.find((recipe) => !recipeIsExcluded(recipe, identity.user.foodExclusions));

  const entryRecipes = query
    ? await prisma.recipe.findMany({
        where: {
          AND: [{ householdId: identity.membership.householdId }, { archived: false }, visibleTo(identity), { OR:
            suitableEntries.length > 0
              ? suitableEntries.map((r) => ({ bookId: r.bookId, pageRef: r.page }))
              : [{ id: "none" }] }],
        },
        select: { id: true, bookId: true, pageRef: true },
      })
    : [];

  const recipeFor = (bookId: string, page: number) =>
    entryRecipes.find((r) => r.bookId === bookId && r.pageRef === page);

  const firstName = identity.user.displayName.trim().split(/\s+/)[0];

  const total = groupedEntries.length + suitableRecipes.length;

  const filterHref = (value: string) =>
    `/cook?q=${encodeURIComponent(query)}${value === "all" ? "" : `&f=${value}`}`;

  return (
    <div className={styles.wrap}>
      <section className={`${styles.hero} ${query ? styles.heroCompact : ""} marvin-animate-in`}>
        {!query ? (
          <h1 className={styles.tagline}>
            What are we <span className={styles.accent}>making</span>, {firstName}?
          </h1>
        ) : (
          <h1 className={styles.srOnly}>Search results for &ldquo;{query}&rdquo;</h1>
        )}
        <form className={styles.searchForm} action="/cook" method="get">
          <div className={styles.searchBox}>
            <Icon name="search" className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Try “aubergine” or “Tuesday curry”…"
              autoComplete="off"
            />
            <button type="submit" className={styles.searchSubmit} aria-label="Search">
              <Icon name="search" className={styles.searchSubmitIcon} />
            </button>
          </div>
        </form>
        {!query && (
          <div className={styles.quickActions}>
            <Link href="/decide" className={`${styles.quickAction} ${styles.quickActionPrimary}`}>
              <Icon name="sparkle" className={`${styles.quickActionIcon} marvin-inspire-icon`} /> Inspire me
            </Link>
            <Link href="/recipes/add" className={styles.quickAction}>Bring in a recipe</Link>
            <Link href="/snap" className={styles.quickAction}>
              <Icon name="camera" className={styles.quickActionIcon} /> Snap what you cooked
            </Link>
          </div>
        )}
      </section>

      {!query && (
        <>
        {featuredRecipe && <Link href={`/recipes/${featuredRecipe.id}`} className={styles.featured}>
          {featuredRecipe.photos[0] ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={photoMediaUrl(featuredRecipe.photos[0])} alt="" className={styles.featuredImage} />
          ) : <div className={styles.featuredFallback}>🍲</div>}
          <div className={styles.featuredContent}>
            <span className={styles.featuredLabel}>Cook again</span>
            <h2>{featuredRecipe.title}</h2>
            <p>A favourite from your kitchen</p>
          </div>
        </Link>}
        <section className={styles.kitchenPaths} aria-label="Kitchen shortcuts">
          <Link href="/recipes" className={styles.kitchenPath}>
            <span className={styles.kitchenPathIcon}>🍽</span>
            <span className={styles.kitchenPathCopy}>
              <small>Your recipes</small>
              <strong>Browse what you&rsquo;ve saved</strong>
              <span>{recipeCount === 0 ? "Bring in your first recipe" : `${recipeCount} ${recipeCount === 1 ? "recipe" : "recipes"} in your kitchen`}</span>
            </span>
            <b aria-hidden="true">→</b>
          </Link>
          <Link href="/books" className={styles.kitchenPath}>
            <span className={styles.kitchenPathIcon}>▤</span>
            <span className={styles.kitchenPathCopy}>
              <small>Cookbooks</small>
              <strong>Browse your book shelf</strong>
              <span>{bookCount === 0 ? "Add your first cookbook" : `${bookCount} ${bookCount === 1 ? "book" : "books"} to explore`}</span>
            </span>
            <b aria-hidden="true">→</b>
          </Link>
          <Link href="/log" className={styles.kitchenPath}>
            <span className={styles.kitchenPathIcon}>◷</span>
            <span className={styles.kitchenPathCopy}>
              <small>Kitchen history</small>
              <strong>Remember what you made</strong>
              <span>Meals, notes and favourites</span>
            </span>
            <b aria-hidden="true">→</b>
          </Link>
          <Link href="/dictionary" className={styles.kitchenPath}>
            <span className={styles.kitchenPathIcon}>⌘</span>
            <span className={styles.kitchenPathCopy}>
              <small>Kitchen help</small>
              <strong>Cooking dictionary</strong>
              <span>Clear explanations, from roux to sauté</span>
            </span>
            <b aria-hidden="true">→</b>
          </Link>
        </section>
        </>
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

              {suitableRecipes.map((r) => (
                <Link
                  key={`recipe-${r.id}`}
                  href={`/recipes/${r.id}`}
                  className={`card ${styles.result}`}
                >
                  {r.photos[0] ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={photoMediaUrl(r.photos[0])}
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
                        : r.source === "hybrid" ? "Adapted cookbook recipe" : "My own recipe"}
                    </p>
                    <div className={styles.resultTags}>
                      <span className="tag">
                        {r.source === "book" ? "Book recipe" : r.source === "hybrid" ? "Adapted" : "Personal"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}

              {groupedEntries.map((r) => {
                const recipe = recipeFor(r.bookId, r.page);
                const ingredients = [...r.ingredients];
                return (
                  <div key={r.id} className={`card ${styles.result}`}>
                    {r.book.coverUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={bookCoverMediaUrl(r.book)!}
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
                        {ingredients.slice(0, 3).map((ingredient) => <span className="tag" key={ingredient}>{ingredient}</span>)}
                        {ingredients.length > 3 && <span className={styles.moreIngredients}>+{ingredients.length - 3} more index entries</span>}
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
