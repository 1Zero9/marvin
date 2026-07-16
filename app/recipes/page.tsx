import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./recipes.module.css";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const recipes = await prisma.recipe.findMany({
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
        <h1 className={styles.title}>Your recipes</h1>
        <Link href="/recipes/add" className="btn btn-primary">
          Add a recipe
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
                </p>
                <div className={styles.tags}>
                  <span className="tag">
                    {r.source === "book" ? "From a book" : "Personal"}
                  </span>
                  {r._count.cookLogs > 0 && (
                    <span className="tag">
                      Cooked {r._count.cookLogs}×
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
