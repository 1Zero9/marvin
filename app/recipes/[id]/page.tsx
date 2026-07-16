import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import styles from "./recipe.module.css";

export const dynamic = "force-dynamic";

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      book: { select: { id: true, title: true } },
      photos: { orderBy: { createdAt: "asc" } },
      cookLogs: {
        orderBy: { cookedAt: "desc" },
        include: { photos: true },
      },
    },
  });
  if (!recipe) notFound();

  const added = recipe.createdAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className={styles.wrap}>
      <div>
        <h1 className={styles.title}>{recipe.title}</h1>
        <p className={styles.meta}>
          {recipe.book ? (
            <>
              <Link href={`/books/${recipe.book.id}`} className={styles.bookLink}>
                {recipe.book.title}
              </Link>
              {recipe.pageRef ? ` · p.${recipe.pageRef}` : ""}
            </>
          ) : (
            "My own recipe"
          )}
          {" · Added "}
          {added}
        </p>
        {recipe.tags.length > 0 && (
          <div className={styles.tags}>
            {recipe.tags.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {recipe.photos.length > 0 && (
        <div className={styles.photos}>
          {recipe.photos.map((p) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img key={p.id} src={p.url} alt="" className={styles.photo} />
          ))}
        </div>
      )}

      <div className={styles.columns}>
        {recipe.ingredients && (
          <section className={`card ${styles.section}`}>
            <h2 className={styles.sectionTitle}>Ingredients</h2>
            <p className={styles.pre}>{recipe.ingredients}</p>
          </section>
        )}
        {recipe.instructions && (
          <section className={`card ${styles.section}`}>
            <h2 className={styles.sectionTitle}>Instructions</h2>
            <p className={styles.pre}>{recipe.instructions}</p>
          </section>
        )}
      </div>

      {recipe.notes && (
        <section className={`card ${styles.section} ${styles.notes}`}>
          <h2 className={styles.sectionTitle}>Notes</h2>
          <p className={styles.pre}>{recipe.notes}</p>
        </section>
      )}

      {recipe.links.length > 0 && (
        <section className={`card ${styles.section}`}>
          <h2 className={styles.sectionTitle}>Links</h2>
          <ul className={styles.linkList}>
            {recipe.links.map((l) => (
              <li key={l}>
                <a
                  href={l}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.extLink}
                >
                  {l.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={`card ${styles.section}`}>
        <div className={styles.logHeader}>
          <h2 className={styles.sectionTitle}>Cook log</h2>
          <Link href={`/recipes/${recipe.id}/log`} className="btn btn-primary">
            Log a cook
          </Link>
        </div>
        {recipe.cookLogs.length === 0 ? (
          <p className={styles.emptyText}>
            Not cooked yet — log it the next time you make it.
          </p>
        ) : (
          <ul className={styles.logList}>
            {recipe.cookLogs.map((log) => (
              <li key={log.id} className={styles.logItem}>
                <div className={styles.logTop}>
                  <span className={styles.logDate}>
                    {log.cookedAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {log.rating != null && (
                    <span className={styles.stars}>
                      {"★".repeat(log.rating)}
                      {"☆".repeat(5 - log.rating)}
                    </span>
                  )}
                </div>
                {log.notes && <p className={styles.pre}>{log.notes}</p>}
                {log.photos.length > 0 && (
                  <div className={styles.photos}>
                    {log.photos.map((p) => (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        key={p.id}
                        src={p.url}
                        alt=""
                        className={styles.photoSmall}
                      />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
