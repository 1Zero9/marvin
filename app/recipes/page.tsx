import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";
import { visibleTo } from "@/lib/privacy";
import { photoMediaUrl } from "@/lib/media";
import { recipeIsExcluded } from "@/lib/foodPreferences";
import { recipeSource, recipeSourceLabel, type RecipeSource } from "@/lib/recipeSource";
import KitchenTabs from "@/components/KitchenTabs";
import styles from "./recipes.module.css";

export const dynamic = "force-dynamic";

const sourceFilters: { value: "all" | RecipeSource; label: string }[] = [
  { value: "all", label: "All recipes" },
  { value: "personal", label: "My own" },
  { value: "book", label: "From cookbooks" },
  { value: "hybrid", label: "Adapted" },
];
const PAGE_SIZE = 48;

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; archived?: string; p?: string }>;
}) {
  const { source: rawSource, archived: rawArchived, p: rawPage } = await searchParams;
  const identity = await requireHousehold();
  const showArchived = rawArchived === "1";
  const activeSource = sourceFilters.some((filter) => filter.value === rawSource)
    ? (rawSource as "all" | RecipeSource)
    : "all";
  const parsedPage = Number(rawPage);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const sourceValues = activeSource === "personal"
    ? ["personal"]
    : activeSource === "book"
      ? ["book"]
      : activeSource === "hybrid"
        ? ["hybrid"]
        : undefined;
  const candidates = await prisma.recipe.findMany({
    where: {
      householdId: identity.membership.householdId,
      archived: showArchived,
      ...(sourceValues ? { source: { in: sourceValues } } : {}),
      ...visibleTo(identity),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, ingredients: true, tags: true, keywords: true },
  });
  const visibleCandidateIds = candidates
    .filter((recipe) => !recipeIsExcluded(recipe, identity.user.foodExclusions))
    .map((recipe) => recipe.id);
  const pageIds = visibleCandidateIds.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageRecipes = pageIds.length ? await prisma.recipe.findMany({
    where: { id: { in: pageIds } },
    include: {
      book: { select: { title: true } },
      photos: { take: 1, orderBy: { createdAt: "asc" } },
      _count: { select: { cookLogs: { where: { countsAsCooked: true } } } },
    },
  }) : [];
  const recipeById = new Map(pageRecipes.map((recipe) => [recipe.id, recipe]));
  const recipes = pageIds.flatMap((id) => recipeById.get(id) ?? []);
  const hasNextPage = page * PAGE_SIZE < visibleCandidateIds.length;
  const filterHref = (value: "all" | RecipeSource) => {
    const params = new URLSearchParams();
    if (value !== "all") params.set("source", value);
    if (showArchived) params.set("archived", "1");
    const search = params.toString();
    return search ? `/recipes?${search}` : "/recipes";
  };
  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (activeSource !== "all") params.set("source", activeSource);
    if (showArchived) params.set("archived", "1");
    if (targetPage > 1) params.set("p", String(targetPage));
    const search = params.toString();
    return search ? `/recipes?${search}` : "/recipes";
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>Kitchen library</p>
          <h1 className={styles.title}>{showArchived ? "Archived recipes" : "Your recipes"}</h1>
          <p className={styles.sub}>{showArchived ? "Recipes you have set aside. Restore one whenever it earns a place back in your kitchen." : "Everything you’ve saved, whether it started as a note, a screenshot, a link, or a cookbook page."}</p>
        </div>
        <Link href="/recipes/add" className={styles.addLink}>
          + Bring in a recipe
        </Link>
      </div>
      <KitchenTabs active="recipes" />
      <nav className={styles.filters} aria-label="Filter recipes by origin">
        {sourceFilters.map((filter) => (
          <Link
            key={filter.value}
            href={filterHref(filter.value)}
            className={`${styles.filter} ${activeSource === filter.value ? styles.filterActive : ""}`}
          >
            {filter.label}
          </Link>
        ))}
        <Link href={showArchived ? "/recipes" : "/recipes?archived=1"} className={`${styles.filter} ${showArchived ? styles.filterActive : ""}`}>
          {showArchived ? "Back to recipes" : "Archived"}
        </Link>
      </nav>

      {recipes.length === 0 ? (
        <div className={`card ${styles.empty}`}>
          <p style={{ marginBottom: 16 }}>
            {showArchived
              ? "No archived recipes. Archive a recipe when you want to keep it without seeing it in everyday cooking."
              : activeSource === "all"
              ? "No recipes yet. Bring in a note, photo, screenshot, link, or just the name of something you’d like to remember."
              : "Nothing in this part of your kitchen yet. Bring in a recipe and choose where it began."}
          </p>
          <Link href="/recipes/add" className="btn btn-primary">
            Add a recipe
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {recipes.map((r) => (
            <Link
              key={r.id}
              href={`/recipes/${r.id}`}
              className={`card ${styles.recipe} ${styles[`recipe${recipeSource(r.source)[0].toUpperCase()}${recipeSource(r.source).slice(1)}`]}`}
            >
              {r.photos[0] ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={photoMediaUrl(r.photos[0])} alt="" className={styles.photo} />
              ) : (
                <div className={styles.photoFallback}>🍽</div>
              )}
              <div className={styles.info}>
                <span className={`${styles.sourceBadge} ${styles[`source${recipeSource(r.source)[0].toUpperCase()}${recipeSource(r.source).slice(1)}`]}`}>
                  {recipeSourceLabel(r.source)}
                </span>
                <h2 className={styles.recipeTitle}>{r.title}</h2>
                <p className={styles.meta}>
                  {r.book
                    ? `${r.book.title}${r.pageRef ? ` · p.${r.pageRef}` : ""}`
                    : recipeSource(r.source) === "hybrid"
                      ? "Cookbook reference not linked"
                      : "Saved by you"}
                  {r._count.cookLogs > 0 &&
                    ` · cooked ${r._count.cookLogs}×`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
      {(page > 1 || hasNextPage) && (
        <nav className={styles.pagination} aria-label="Recipe pages">
          {page > 1 ? <Link className="btn btn-secondary" href={pageHref(page - 1)}>Previous</Link> : <span />}
          <span>Page {page}</span>
          {hasNextPage ? <Link className="btn btn-secondary" href={pageHref(page + 1)}>Next</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
