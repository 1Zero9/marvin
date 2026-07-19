import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";
import { visibleTo } from "@/lib/privacy";
import styles from "./moments.module.css";

export const dynamic = "force-dynamic";

function dateLabel(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function MomentsPage() {
  const identity = await requireHousehold();
  const logs = await prisma.cookLog.findMany({
    where: { context: "out", recipe: { householdId: identity.membership.householdId, ...visibleTo(identity) } },
    include: { recipe: { select: { id: true, title: true } }, photos: { take: 1, orderBy: { createdAt: "asc" } } },
    orderBy: { cookedAt: "desc" },
  });
  return <div className={styles.wrap}>
    <div className={styles.header}><div><h1>Food memories</h1><p>The great things you ate out, ready to bring home.</p></div><Link className="btn btn-primary" href="/log/add">＋ Add a memory</Link></div>
    {logs.length === 0 ? <section className={`card ${styles.empty}`}><span>🍽</span><h2>No food memories yet</h2><p>At a restaurant, on holiday, or at a market — save a photo and the details here.</p><Link className="btn btn-primary" href="/log/add">Save your first one</Link></section> : <section className={styles.grid}>{logs.map((log) => <article key={log.id} className={`card ${styles.card}`}>
      {log.photos[0] ? <img src={log.photos[0].url} alt={log.recipe.title} /> : <div className={styles.noPhoto}>🍽</div>}
      <div className={styles.body}><div><h2>{log.recipe.title}</h2><p>{[log.venue, dateLabel(log.cookedAt)].filter(Boolean).join(" · ")}</p></div>{log.rating && <span className={styles.rating}>{"★".repeat(log.rating)}</span>}</div>
      {log.notes && <p className={styles.notes}>{log.notes}</p>}
      {log.tags.length > 0 && <div className={styles.tags}>{log.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
      <Link href={`/recipes/${log.recipe.id}`} className={styles.recreate}>Make it at home →</Link>
    </article>)}</section>}
  </div>;
}
