export default function Loading() {
  return (
    <div className="page-loading" role="status" aria-label="Loading">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-block" />
      <div className="skeleton skeleton-block short" />
    </div>
  );
}
