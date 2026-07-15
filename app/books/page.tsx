export default function BooksPage() {
  return (
    <div>
      <h1 style={{ fontSize: "2rem", marginBottom: 16 }}>Your books</h1>
      <div
        className="card"
        style={{ textAlign: "center", padding: "40px 24px" }}
      >
        <p style={{ marginBottom: 16 }}>
          No books yet. Scan a barcode to add your first cookbook.
        </p>
        <a href="/books/add" className="btn btn-primary">
          Add a book
        </a>
      </div>
    </div>
  );
}
