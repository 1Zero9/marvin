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

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source: rawSource } = await searchParams;
  const identity = await requireHousehold();
  const activeSource = sourceFilters.some((filter) => filter.value === rawSource)
    ? (rawSource as "all" | RecipeSource)
    : "all";
  const allRecipes = await prisma.recipe.findMany({
    where: { householdId: identity.membership.householdId, ...visibleTo(identity) },
    orderBy: { createdAt: "desc" },
    include: {
      book: { select: { title: true } },
      photos: { take: 1, orderBy: { createdAt: "asc" } },
      _count: { select: { cookLogs: true } },
    },
  });
  const recipes = allRecipes
    .filter((recipe) => !recipeIsExcluded(recipe, identity.user.foodExclusions))
    .filter((recipe) => activeSource === "all" || recipeSource(recipe.source) === activeSource);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>Kitchen library</p>
          <h1 className={styles.title}>Your recipes</h1>
          <p className={styles.sub}>Everything you&rsquo;ve saved, whether it started as a note, a screenshot, a link, or a cookbook page.</p>
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
            href={filter.value === "all" ? "/recipes" : `/recipes?source=${filter.value}`}
            className={`${styles.filter} ${activeSource === filter.value ? styles.filterActive : ""}`}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {recipes.length === 0 ? (
        <div className={`card ${styles.empty}`}>
          <p style={{ marginBottom: 16 }}>
            {activeSource === "all"
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
    </div>
  );
}
