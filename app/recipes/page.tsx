import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";
import { visibleTo } from "@/lib/privacy";
import styles from "./recipes.module.css";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const identity = await requireHousehold();
  const recipes = await prisma.recipe.findMany({
    where: { householdId: identity.membership.householdId, ...visibleTo(identity) },
    orderBy: { createdAt: "desc" },
    include: {
      book: { select: { title: true } },
      photos: { take: 1, orderBy: { createdAt: "asc" } },
      _count: { select: { cookLogs: true } },
    },
  });

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Recipes</h1>
        <Link href="/recipes/add" className={styles.addLink}>
          + Add
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div className={`card ${styles.empty}`}>
          <p style={{ marginBottom: 16 }}>
            No recipes yet. Add a manual recipe or one adapted from a book.
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
              className={`card ${styles.recipe}`}
            >
              {r.photos[0] ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={r.photos[0].url} alt="" className={styles.photo} />
              ) : (
                <div className={styles.photoFallback}>🍽</div>
              )}
              <div className={styles.info}>
                <h2 className={styles.recipeTitle}>{r.title}</h2>
                <p className={styles.meta}>
                  {r.book
                    ? `${r.book.title}${r.pageRef ? ` · p.${r.pageRef}` : ""}`
                    : "My own"}
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
