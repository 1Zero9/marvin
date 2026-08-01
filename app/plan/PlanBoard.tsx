"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./plan.module.css";

type MealType = "breakfast" | "lunch";

type Recipe = { id: string; title: string };
type PlanItem = {
  date: string;
  mealType: MealType;
  recipeId: string | null;
  freeformText: string | null;
  label: string;
};

type Draft = { mode: "recipe" | "custom"; recipeId: string; freeformText: string };

function itemKey(date: string, mealType: MealType) {
  return `${date}:${mealType}`;
}

function initialDraft(item: PlanItem | undefined): Draft {
  if (item?.recipeId) return { mode: "recipe", recipeId: item.recipeId, freeformText: "" };
  return { mode: "custom", recipeId: "", freeformText: item?.freeformText ?? "" };
}

function MealSlot({
  date,
  mealType,
  label,
  item,
  recipes,
  onSave,
  onRemove,
}: {
  date: string;
  mealType: MealType;
  label: string;
  item?: PlanItem;
  recipes: Recipe[];
  onSave: (item: PlanItem) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(!item);
  const [draft, setDraft] = useState(() => initialDraft(item));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function edit() {
    setDraft(initialDraft(item));
    setError(null);
    setEditing(true);
  }

  async function save() {
    const recipeId = draft.mode === "recipe" ? draft.recipeId : "";
    const freeformText = draft.mode === "custom" ? draft.freeformText.trim() : "";
    if (!recipeId && !freeformText) {
      setError(draft.mode === "recipe" ? "Choose a recipe." : "Write a meal first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, mealType, recipeId: recipeId || null, freeformText: freeformText || null }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Couldn’t save this meal.");
      const recipe = recipes.find((candidate) => candidate.id === recipeId);
      await onSave({ date, mealType, recipeId: recipeId || null, freeformText: freeformText || null, label: recipe?.title ?? freeformText });
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn’t save this meal.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/plan", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, mealType }),
      });
      if (!res.ok) throw new Error("Couldn’t remove this meal.");
      await onRemove();
      setDraft({ mode: "recipe", recipeId: "", freeformText: "" });
      setEditing(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn’t remove this meal.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing && item) {
    return (
      <div className={styles.savedSlot}>
        <div>
          <p className={styles.mealLabel}>{label}</p>
          <p className={styles.mealValue}>{item.label}</p>
        </div>
        <div className={styles.slotActions}>
          <button type="button" className={styles.textButton} onClick={edit}>Change</button>
          <button type="button" className={styles.textButton} disabled={saving} onClick={remove}>Remove</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.editSlot}>
      <p className={styles.mealLabel}>{label}</p>
      <div className={styles.modeButtons}>
        <button type="button" className={`${styles.modeButton} ${draft.mode === "recipe" ? styles.modeActive : ""}`} onClick={() => setDraft((value) => ({ ...value, mode: "recipe" }))}>Recipe</button>
        <button type="button" className={`${styles.modeButton} ${draft.mode === "custom" ? styles.modeActive : ""}`} onClick={() => setDraft((value) => ({ ...value, mode: "custom" }))}>Write it down</button>
      </div>
      {draft.mode === "recipe" ? (
        <select className="input" value={draft.recipeId} onChange={(event) => setDraft((value) => ({ ...value, recipeId: event.target.value }))}>
          <option value="">Choose from your kitchen</option>
          {recipes.map((recipe) => <option value={recipe.id} key={recipe.id}>{recipe.title}</option>)}
        </select>
      ) : (
        <input className="input" maxLength={160} value={draft.freeformText} onChange={(event) => setDraft((value) => ({ ...value, freeformText: event.target.value }))} placeholder="e.g. eggs and toast" />
      )}
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.editActions}>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</button>
        {item && <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setEditing(false)}>Cancel</button>}
      </div>
    </div>
  );
}

export default function PlanBoard({
  days,
  recipes,
  initialItems,
}: {
  days: { date: string; label: string }[];
  recipes: Recipe[];
  initialItems: PlanItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Record<string, PlanItem>>(() => Object.fromEntries(initialItems.map((item) => [itemKey(item.date, item.mealType), item])));
  const [selectedDate, setSelectedDate] = useState(days[0]?.date ?? "");

  async function save(item: PlanItem) {
    setItems((current) => ({ ...current, [itemKey(item.date, item.mealType)]: item }));
    router.refresh();
  }

  async function remove(date: string, mealType: MealType) {
    setItems((current) => {
      const next = { ...current };
      delete next[itemKey(date, mealType)];
      return next;
    });
    router.refresh();
  }

  return (
    <>
      <nav className={styles.daySelector} aria-label="Choose a day">
        {days.map((day) => {
          const dayNumber = new Date(`${day.date}T12:00:00`).getDate();
          const shortDay = new Date(`${day.date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 1);
          const hasPlan = Boolean(items[itemKey(day.date, "breakfast")] || items[itemKey(day.date, "lunch")]);
          return <button key={day.date} type="button" onClick={() => setSelectedDate(day.date)} className={`${styles.dayPick} ${selectedDate === day.date ? styles.dayPickActive : ""}`} aria-pressed={selectedDate === day.date}><span>{shortDay}</span><strong>{dayNumber}</strong>{hasPlan && <i aria-label="Has planned meal" />}</button>;
        })}
      </nav>
      <section className={styles.days} aria-label="Your weekly meal plan">
      {days.map((day) => (
        <article className={`card ${styles.dayCard} ${selectedDate === day.date ? styles.dayCardSelected : ""}`} key={day.date}>
          <h2 className={styles.dayTitle}>{day.label}</h2>
          <MealSlot date={day.date} mealType="breakfast" label="Breakfast" item={items[itemKey(day.date, "breakfast")]} recipes={recipes} onSave={save} onRemove={() => remove(day.date, "breakfast")} />
          <MealSlot date={day.date} mealType="lunch" label="Lunch" item={items[itemKey(day.date, "lunch")]} recipes={recipes} onSave={save} onRemove={() => remove(day.date, "lunch")} />
        </article>
      ))}
      </section>
    </>
  );
}
