const PRIVATE_BLOB_HOST_SUFFIX = ".private.blob.vercel-storage.com";

export function isPrivateBlobUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    return new URL(value).hostname.endsWith(PRIVATE_BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}

export function photoMediaUrl(photo: { id: string; url: string }, shareSlug?: string) {
  if (!isPrivateBlobUrl(photo.url)) return photo.url;
  const base = `/api/media/photo/${photo.id}`;
  return shareSlug ? `${base}?share=${encodeURIComponent(shareSlug)}` : base;
}

export function bookCoverMediaUrl(book: { id: string; coverUrl: string | null }) {
  if (!book.coverUrl || !isPrivateBlobUrl(book.coverUrl)) return book.coverUrl;
  return `/api/media/book/${book.id}`;
}

export function privateMediaToken() {
  return process.env.PRIVATE_BLOB_READ_WRITE_TOKEN ?? null;
}
