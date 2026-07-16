import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";
import { visibleTo } from "@/lib/privacy";
import styles from "./recipe.module.css";
import MealRatingActions from "@/components/MealRatingActions";

export const dynamic = "force-dynamic";

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const identity = await requireHousehold();
  const recipe = await prisma.recipe.findUnique({
    where: { id, householdId: identity.membership.householdId, ...visibleTo(identity) },
    include: {
      book: { select: { id: true, title: true } },
      photos: { orderBy: { createdAt: "asc" } },
      cookLogs: {
        orderBy: { cookedAt: "desc" },
        include: { photos: true, cookedBy: { select: { displayName: true } }, ratings: { include: { user: { select: { displayName: true } } } } },
      },
    },
  });
  if (!recipe) notFound();

  const added = recipe.createdAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const ratedLogs = recipe.cookLogs.filter((log) => log.rating != null);
  const averageRating = ratedLogs.length
    ? ratedLogs.reduce((total, log) => total + (log.rating ?? 0), 0) /
      ratedLogs.length
    : null;
  const lastCooked = recipe.cookLogs[0]?.cookedAt;

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
        {recipe.cookLogs.length > 0 && (
          <p className={styles.cookSummary}>
            Cooked {recipe.cookLogs.length} {recipe.cookLogs.length === 1 ? "time" : "times"}
            {lastCooked ? ` · last cooked ${lastCooked.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
            {averageRating ? ` · ${averageRating.toFixed(1)} ★ average` : ""}
          </p>
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
                  {log.cookedBy && <span className={styles.cookedBy}>Cooked by {log.cookedBy.displayName}</span>}
                  {log.rating != null && (
                    <span className={styles.stars}>
                      {"★".repeat(log.rating)}
                      {"☆".repeat(5 - log.rating)}
                    </span>
                  )}
                </div>
                {log.notes && <p className={styles.pre}>{log.notes}</p>}
                {log.ratings.length > 0 && <p className={styles.ratings}>{log.ratings.map((rating) => `${rating.user.displayName}: ${"★".repeat(rating.rating)}`).join(" · ")}</p>}
                <MealRatingActions logId={log.id} initialRating={log.ratings.find((rating) => rating.userId === identity.user.id)?.rating} initialNotes={log.ratings.find((rating) => rating.userId === identity.user.id)?.notes ?? undefined} />
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
