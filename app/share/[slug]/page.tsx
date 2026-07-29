import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { photoMediaUrl } from "@/lib/media";
import styles from "./share.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function SharedRecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recipe = await prisma.recipe.findFirst({
    where: { shareSlug: slug, shareEnabled: true },
    select: {
      title: true,
      ingredients: true,
      instructions: true,
      tags: true,
      links: true,
      photos: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!recipe) notFound();

  return (
    <div className={styles.wrap}>
      <Link href="/" className={styles.brand}>Marvin</Link>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>A shared recipe</p>
        <h1>{recipe.title}</h1>
        {recipe.tags.length > 0 && <div className={styles.tags}>{recipe.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>}
      </header>
      {recipe.photos.length > 0 && (
        <div className={styles.photos}>
          {recipe.photos.map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={photo.id} src={photoMediaUrl(photo, slug)} alt="" className={styles.photo} />
          ))}
        </div>
      )}
      <div className={styles.columns}>
        {recipe.ingredients && <section className={`card ${styles.section}`}><h2>Ingredients</h2><p className={styles.pre}>{recipe.ingredients}</p></section>}
        {recipe.instructions && <section className={`card ${styles.section}`}><h2>Method</h2><p className={styles.pre}>{recipe.instructions}</p></section>}
      </div>
      {recipe.links.length > 0 && (
        <section className={`card ${styles.section}`}>
          <h2>Links</h2>
          <ul className={styles.links}>{recipe.links.map((link) => <li key={link}><a href={link} target="_blank" rel="noopener noreferrer">{link.replace(/^https?:\/\/(www\.)?/, "").slice(0, 70)}</a></li>)}</ul>
        </section>
      )}
      <p className={styles.footer}>Shared from Marvin. This page contains recipe details only.</p>
    </div>
  );
}
