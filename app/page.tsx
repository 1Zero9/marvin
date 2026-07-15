import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.wrap}>
      <section className={styles.hero}>
        <h1 className={styles.title}>
          What&rsquo;s in your <span className={styles.accent}>cookbooks?</span>
        </h1>
        <p className={styles.sub}>
          Search every indexed book by ingredient or dish name.
        </p>
        <form className={styles.searchForm} action="/" method="get">
          <input
            className={`input ${styles.searchInput}`}
            type="search"
            name="q"
            placeholder="Try “aubergine” or “ragu”…"
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
      </section>

      <section>
        <div className={`card ${styles.empty}`}>
          <h2 className={styles.emptyTitle}>No books indexed yet</h2>
          <p className={styles.emptyText}>
            Scan a cookbook&rsquo;s barcode and photograph its index to make it
            searchable.
          </p>
          <a href="/books/add" className="btn btn-primary">
            Add your first book
          </a>
        </div>
      </section>
    </div>
  );
}
