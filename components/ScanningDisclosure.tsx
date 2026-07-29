import Link from "next/link";
import styles from "./ScanningDisclosure.module.css";

type ScanKind = "isbn" | "book-index" | "recipe" | "food";

const copy: Record<ScanKind, string> = {
  isbn: "Barcode detection stays in your browser. Marvin sends the ISBN number to book-lookup services; if they cannot find it, optional AI help may be used. The camera image itself is not uploaded.",
  "book-index": "When you choose Extract index, those index photos are sent to Gemini to read the entries. Only scan pages you own or have permission to process.",
  recipe: "When you choose to scan or sort, the selected recipe photo or pasted text is sent to Gemini to structure it. Only use material you own or have permission to process.",
  food: "When you choose a photo, it is sent to Gemini to identify the dish and likely ingredients. Avoid photos containing people, private documents, or other sensitive information.",
};

export default function ScanningDisclosure({ kind }: { kind: ScanKind }) {
  return <aside className={styles.notice} role="note"><strong>Before you scan</strong><p>{copy[kind]} Health, reflections, and daily tracking are never sent. You can turn optional AI help off in <Link href="/account">Privacy controls</Link>.</p></aside>;
}
