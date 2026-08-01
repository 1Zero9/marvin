import CookingDictionary from "@/components/CookingDictionary";
import styles from "./dictionary.module.css";

export const metadata = { title: "Cooking dictionary | Marvin" };

export default function DictionaryPage() {
  return <div className={styles.wrap}>
    <header className={styles.hero}>
      <p className={styles.eyebrow}>Kitchen help</p>
      <h1>Cooking dictionary</h1>
      <p>Clear, practical explanations for the words recipes assume you already know. Start with roux, then make the kitchen feel like yours.</p>
    </header>
    <CookingDictionary />
  </div>;
}
