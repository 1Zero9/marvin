"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./shopping.module.css";

type Item = { id: string; ingredient: string; quantity: string | null; checked: boolean; source: string };

export default function ShoppingList({ weekStart, initialItems }: { weekStart: string; initialItems: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [ingredient, setIngredient] = useState("");
  const [quantity, setQuantity] = useState("");
  const [working, setWorking] = useState<"generate" | "add" | string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const remaining = useMemo(() => items.filter((item) => !item.checked).length, [items]);

  async function generate() {
    setWorking("generate"); setMessage(null);
    try {
      const res = await fetch("/api/shopping/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weekStart }) });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data?.items)) throw new Error(data?.error || "Couldn’t build the list.");
      setItems(data.items);
      setMessage(data.generated ? `Built ${data.generated} item${data.generated === 1 ? "" : "s"} from recipes in your plan. Manual items stayed put.` : "There were no recipe ingredients to add from this plan yet.");
      router.refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Couldn’t build the list."); }
    finally { setWorking(null); }
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!ingredient.trim()) return;
    setWorking("add"); setMessage(null);
    try {
      const res = await fetch("/api/shopping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weekStart, ingredient, quantity }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn’t add that item.");
      setItems((current) => [...current, data]);
      setIngredient(""); setQuantity("");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Couldn’t add that item."); }
    finally { setWorking(null); }
  }

  async function toggle(item: Item) {
    setWorking(item.id); setMessage(null);
    try {
      const res = await fetch("/api/shopping", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, checked: !item.checked }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn’t update that item.");
      setItems((current) => current.map((entry) => entry.id === item.id ? data : entry));
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Couldn’t update that item."); }
    finally { setWorking(null); }
  }

  async function remove(id: string) {
    setWorking(id); setMessage(null);
    try {
      const res = await fetch("/api/shopping", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error("Couldn’t remove that item.");
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Couldn’t remove that item."); }
    finally { setWorking(null); }
  }

  return <>
    <section className={`card ${styles.generateCard}`}>
      <div><h2>From your plan</h2><p>Build a best-effort list from recipe ingredients. Your own manual items are kept when you rebuild it.</p></div>
      <button type="button" className="btn btn-primary" disabled={working !== null} onClick={generate}>{working === "generate" ? "Building…" : "Build from plan"}</button>
    </section>
    <form className={`card ${styles.addForm}`} onSubmit={add}>
      <label><span>Need something else?</span><input className="input" value={ingredient} maxLength={160} onChange={(event) => setIngredient(event.target.value)} placeholder="e.g. coffee" /></label>
      <label><span>Amount (optional)</span><input className="input" value={quantity} maxLength={60} onChange={(event) => setQuantity(event.target.value)} placeholder="e.g. 1 bag" /></label>
      <button type="submit" className="btn btn-secondary" disabled={working !== null || !ingredient.trim()}>{working === "add" ? "Adding…" : "Add item"}</button>
    </form>
    <section className={`card ${styles.listCard}`}>
      <div className={styles.listHeading}><h2>Your list</h2><span>{remaining ? `${remaining} to get` : items.length ? "All done" : "Nothing yet"}</span></div>
      {items.length === 0 ? <p className={styles.empty}>Add something above, or make a meal plan first.</p> : <ul className={styles.list}>
        {items.map((item) => <li className={`${styles.item} ${item.checked ? styles.checked : ""}`} key={item.id}>
          <label className={styles.checkLabel}><input type="checkbox" checked={item.checked} disabled={working === item.id} onChange={() => toggle(item)} /><span><strong>{item.ingredient}</strong>{item.quantity && <em>{item.quantity}</em>}</span></label>
          <button type="button" className={styles.remove} disabled={working === item.id} onClick={() => remove(item.id)} aria-label={`Remove ${item.ingredient}`}>×</button>
        </li>)}
      </ul>}
    </section>
    {message && <p className={styles.message} role="status">{message}</p>}
  </>;
}
