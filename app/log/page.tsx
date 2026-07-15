export default function LogPage() {
  return (
    <div>
      <h1 style={{ fontSize: "2rem", marginBottom: 16 }}>Cooking log</h1>
      <div
        className="card"
        style={{ textAlign: "center", padding: "40px 24px" }}
      >
        <p>
          Nothing cooked yet. Log a cook from any recipe to start your diary.
        </p>
      </div>
    </div>
  );
}
