import Link from "next/link";
import { requireHousehold } from "@/lib/auth";
import { mondayOf, startOfDay, toDateInput } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import ShoppingList from "./ShoppingList";
import styles from "./shopping.module.css";

export const dynamic = "force-dynamic";

export default async function ShoppingPage() {
  const identity = await requireHousehold();
  const weekStart = mondayOf(startOfDay(new Date()));
  const items = await prisma.shoppingListItem.findMany({
    where: { userId: identity.user.id, weekStartDate: weekStart },
    select: { id: true, ingredient: true, quantity: true, checked: true, source: true },
    orderBy: [{ checked: "asc" }, { createdAt: "asc" }],
  });
  const startLabel = weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  return <div className={styles.wrap}>
    <header className={styles.hero}>
      <p className={styles.eyebrow}>Your week</p>
      <h1>Shopping list</h1>
      <p>For the week beginning {startLabel}. Keep the next food choice easy by having what you need.</p>
      <Link href="/plan" className={styles.back}>← Edit my meal plan</Link>
    </header>
    <p className={styles.private}>🔒 This list is private to you.</p>
    <ShoppingList weekStart={toDateInput(weekStart)} initialItems={items} />
  </div>;
}
