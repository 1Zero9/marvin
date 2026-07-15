export default function RecipesPage() {
  return (
    <div>
      <h1 style={{ fontSize: "2rem", marginBottom: 16 }}>Your recipes</h1>
      <div
        className="card"
        style={{ textAlign: "center", padding: "40px 24px" }}
      >
        <p style={{ marginBottom: 16 }}>
          No recipes yet. Add a manual recipe or one adapted from a book.
        </p>
        <a href="/recipes/add" className="btn btn-primary">
          Add a recipe
        </a>
      </div>
    </div>
  );
}
