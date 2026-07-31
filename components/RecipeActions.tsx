"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./RecipeActions.module.css";

type Candidate = { id: string; title: string; archived: boolean };

export default function RecipeActions({
  recipe,
  mergeCandidates,
}: {
  recipe: {
    id: string;
    title: string;
    ingredients: string | null;
    instructions: string | null;
    notes: string | null;
    tags: string[];
    visibility: string;
    archived: boolean;
  };
  mergeCandidates: Candidate[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [merging, setMerging] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [title, setTitle] = useState(recipe.title);
  const [ingredients, setIngredients] = useState(recipe.ingredients ?? "");
  const [instructions, setInstructions] = useState(recipe.instructions ?? "");
  const [notes, setNotes] = useState(recipe.notes ?? "");
  const [tags, setTags] = useState(recipe.tags.join(", "));
  const [visibility, setVisibility] = useState(recipe.visibility);
  const [error, setError] = useState<string | null>(null);

  async function request(path: string, method: "PATCH" | "POST" | "DELETE", body?: object) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error ?? "Couldn’t save that change.");
      }
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn’t save that change.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) return setError("Give this recipe a name before saving.");
    const saved = await request(`/api/recipes/${recipe.id}`, "PATCH", {
      title: nextTitle,
      ingredients,
      instructions,
      notes,
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      visibility,
    });
    if (saved) {
      setEditing(false);
      router.refresh();
    }
  }

  async function archive() {
    if (await request(`/api/recipes/${recipe.id}`, "PATCH", { archived: !recipe.archived })) router.refresh();
  }

  async function merge() {
    const source = mergeCandidates.find((candidate) => candidate.id === sourceId);
    if (!source) return setError("Choose the duplicate recipe to merge.");
    if (!confirm(`Merge “${source.title}” into “${recipe.title}”? Its cook history, photos and meal-plan links will be kept; the duplicate recipe itself will be removed.`)) return;
    if (await request(`/api/recipes/${recipe.id}/merge`, "POST", { sourceId })) {
      setMerging(false);
      setSourceId("");
      router.refresh();
    }
  }

  async function remove() {
    if (!confirm(`Permanently delete “${recipe.title}” and its cook history, photos and meal-plan links? Archive it instead if you may want it later.`)) return;
    if (await request(`/api/recipes/${recipe.id}`, "DELETE")) {
      router.push("/recipes");
      router.refresh();
    }
  }

  return (
    <section className={`card ${styles.card}`}>
      <div className={styles.heading}>
        <div>
          <h2>Manage this recipe</h2>
          <p>Edit the one you want to keep, then archive, delete, or merge a duplicate.</p>
        </div>
        {recipe.archived && <span className={styles.archived}>Archived</span>}
      </div>
      {editing ? (
        <form className={styles.form} onSubmit={save}>
          <label>Recipe name<input className="input" value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>Ingredients<textarea className="input" rows={5} value={ingredients} onChange={(event) => setIngredients(event.target.value)} /></label>
          <label>Method<textarea className="input" rows={7} value={instructions} onChange={(event) => setInstructions(event.target.value)} /></label>
          <label>Notes<textarea className="input" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
          <label>Tags <span>separate with commas</span><input className="input" value={tags} onChange={(event) => setTags(event.target.value)} /></label>
          <label>Who can see it<select className="input" value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="private">Only me</option><option value="household">My household</option></select></label>
          <div className={styles.actions}><button className="btn btn-primary" disabled={busy}>Save changes</button><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setEditing(false)}>Cancel</button></div>
        </form>
      ) : (
        <div className={styles.actions}>
          <button className="btn btn-secondary" disabled={busy} onClick={() => setEditing(true)}>Edit recipe</button>
          <button className="btn btn-secondary" disabled={busy} onClick={archive}>{recipe.archived ? "Restore recipe" : "Archive recipe"}</button>
          {mergeCandidates.length > 0 && <button className="btn btn-secondary" disabled={busy} onClick={() => setMerging(!merging)}>{merging ? "Cancel merge" : "Merge a duplicate"}</button>}
          <button className={styles.deleteButton} disabled={busy} onClick={remove}>Delete permanently</button>
        </div>
      )}
      {merging && !editing && (
        <div className={styles.merge}>
          <label htmlFor="duplicate-recipe">Duplicate to merge into this recipe</label>
          <select id="duplicate-recipe" className="input" value={sourceId} onChange={(event) => setSourceId(event.target.value)}>
            <option value="">Choose a recipe…</option>
            {mergeCandidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}{candidate.archived ? " (archived)" : ""}</option>)}
          </select>
          <p>The recipe above stays. The selected duplicate is removed after its photos, cook logs, personal suggestions, and meal-plan links move here.</p>
          <button className="btn btn-primary" disabled={busy || !sourceId} onClick={merge}>Merge recipes</button>
        </div>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
  );
}
