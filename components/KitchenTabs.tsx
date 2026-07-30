import Link from "next/link";
import styles from "./KitchenTabs.module.css";

export default function KitchenTabs({ active }: { active: "recipes" | "books" }) {
  return (
    <nav className={styles.tabs} aria-label="Kitchen library">
      <Link href="/recipes" className={`${styles.tab} ${active === "recipes" ? styles.active : ""}`}>Recipes</Link>
      <Link href="/books" className={`${styles.tab} ${active === "books" ? styles.active : ""}`}>Cookbooks</Link>
    </nav>
  );
}
