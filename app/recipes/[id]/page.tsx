import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";
import { canManage, visibleTo } from "@/lib/privacy";
import { photoMediaUrl } from "@/lib/media";
import { recipeSource, recipeSourceLabel } from "@/lib/recipeSource";
import styles from "./recipe.module.css";
import MealRatingActions from "@/components/MealRatingActions";
import RecipeLightener from "@/components/RecipeLightener";
import RecipeShare from "@/components/RecipeShare";
import RecipeKeepAwake from "@/components/RecipeKeepAwake";
import RecipeActions from "@/components/RecipeActions";
import RecipePhotoUploader from "@/components/RecipePhotoUploader";
import AddToShoppingList from "@/components/AddToShoppingList";

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
      swapSuggestions: { where: { userId: identity.user.id }, select: { suggestions: true }, take: 1 },
      variants: { where: { userId: identity.user.id }, select: { id: true }, take: 1 },
    },
  });
  if (!recipe) notFound();

  const added = recipe.createdAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const cookingLogs = recipe.cookLogs.filter((log) => log.countsAsCooked);
  const ratedLogs = cookingLogs.filter((log) => log.rating != null);
  const averageRating = ratedLogs.length
    ? ratedLogs.reduce((total, log) => total + (log.rating ?? 0), 0) /
      ratedLogs.length
    : null;
  const lastCooked = cookingLogs[0]?.cookedAt;
  const canShare = !recipe.createdById || recipe.createdById === identity.user.id;
  const canManageRecipe = canManage(identity, recipe.createdById);
  const mergeCandidates = canManageRecipe
    ? (await prisma.recipe.findMany({
        where: { householdId: identity.membership.householdId, id: { not: recipe.id }, ...visibleTo(identity) },
        select: { id: true, title: true, archived: true, createdById: true },
        orderBy: { title: "asc" },
        take: 250,
      })).filter((candidate) => canManage(identity, candidate.createdById))
    : [];
  const source = recipeSource(recipe.source);

  return (
    <div className={styles.wrap}>
      <div>
        <h1 className={styles.title}>{recipe.title}</h1>
        <p className={styles.meta}>
          <span className={`${styles.sourceBadge} ${styles[`source${source[0].toUpperCase()}${source.slice(1)}`]}`}>
            {recipeSourceLabel(source)}
          </span>
          {recipe.book ? (
            <>
              <Link href={`/books/${recipe.book.id}`} className={`${styles.bookLink} ${styles.sourceBookLink}`}>
                {recipe.book.title}
              </Link>
              {recipe.pageRef ? ` · p.${recipe.pageRef}` : ""}
            </>
          ) : source === "hybrid" ? "Cookbook reference not linked" : null}
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
        {cookingLogs.length > 0 && (
          <p className={styles.cookSummary}>
            Cooked {cookingLogs.length} {cookingLogs.length === 1 ? "time" : "times"}
            {lastCooked ? ` · last cooked ${lastCooked.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
            {averageRating ? ` · ${averageRating.toFixed(1)} ★ average` : ""}
          </p>
        )}
        {!recipe.archived && <p><Link href={`/recipes/${recipe.id}/log`} className="btn btn-primary">Cook now</Link></p>}
      </div>

      <RecipeKeepAwake />

      {recipe.photos.length > 0 && (
        <div className={styles.photos}>
          {recipe.photos.map((p) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img key={p.id} src={photoMediaUrl(p)} alt="" className={styles.photo} />
          ))}
        </div>
      )}

      <RecipePhotoUploader recipeId={recipe.id} />

      <div className={styles.columns}>
        {recipe.ingredients && (
          <section className={`card ${styles.section}`}>
            <div className={styles.logHeader}>
              <h2 className={styles.sectionTitle}>Ingredients</h2>
              <AddToShoppingList recipeId={recipe.id} />
            </div>
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

      <details className={styles.toolbox}>
        <summary className={styles.toolboxSummary}>
          <span><strong>Recipe tools</strong><small>Lighten, share, edit or manage this recipe</small></span>
          <b aria-hidden="true">+</b>
        </summary>
        <div className={styles.toolboxBody}>
          <RecipeLightener
            recipeId={recipe.id}
            initialSuggestions={recipe.swapSuggestions[0]?.suggestions ?? null}
            initialVariant={recipe.variants.length > 0}
          />
          <RecipeShare
            recipeId={recipe.id}
            initialUrl={recipe.shareEnabled && recipe.shareSlug ? `/share/${recipe.shareSlug}` : null}
            canShare={canShare}
          />
          {canManageRecipe && <RecipeActions recipe={recipe} mergeCandidates={mergeCandidates} />}
        </div>
      </details>

      <details className={`card ${styles.section} ${styles.history}`} open={recipe.cookLogs.length <= 2}>
        <summary className={styles.historySummary}>
          <span><strong>Cooking &amp; food memories</strong><small>{recipe.cookLogs.length === 0 ? "Nothing logged yet" : `${recipe.cookLogs.length} ${recipe.cookLogs.length === 1 ? "entry" : "entries"}`}</small></span>
          <b aria-hidden="true">+</b>
        </summary>
        <div className={styles.historyBody}>
        {recipe.cookLogs.length === 0 ? (
          <p className={styles.emptyText}>
            {recipe.archived ? "This recipe is archived. Restore it above if you want to cook it again." : "Not cooked yet — log it the next time you make it."}
          </p>
        ) : (
          <ul className={styles.logList}>
            {recipe.cookLogs.map((log) => (
              <li key={log.id} className={styles.logItem}>
                <div className={styles.logTop}>
                  <span className={styles.logDate}>
                    {log.countsAsCooked ? log.cookedAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }) : `Saved food memory · ${log.cookedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
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
                        src={photoMediaUrl(p)}
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
        </div>
      </details>
    </div>
  );
}
