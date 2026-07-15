import { NextResponse } from "next/server";

type BookMeta = {
  isbn: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  pageCount: number | null;
};

async function fromGoogleBooks(isbn: string): Promise<BookMeta | null> {
  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`,
    { next: { revalidate: 0 } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const info = data?.items?.[0]?.volumeInfo;
  if (!info?.title) return null;
  return {
    isbn,
    title: info.title,
    author: info.authors?.join(", ") ?? null,
    coverUrl:
      info.imageLinks?.thumbnail?.replace("http://", "https://") ?? null,
    pageCount: info.pageCount ?? null,
  };
}

async function coverExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

async function fromOpenLibrary(isbn: string): Promise<BookMeta | null> {
  const res = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&jscmd=data&format=json`,
    { next: { revalidate: 0 } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const info = data?.[`ISBN:${isbn}`];
  if (!info?.title) return null;

  let coverUrl: string | null = info.cover?.large ?? info.cover?.medium ?? null;
  if (!coverUrl) {
    const candidate = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
    coverUrl = (await coverExists(candidate)) ? candidate : null;
  }

  return {
    isbn,
    title: info.title,
    author:
      info.authors?.map((a: { name: string }) => a.name).join(", ") ?? null,
    coverUrl,
    pageCount: info.number_of_pages ?? null,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ isbn: string }> }
) {
  const { isbn } = await params;
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  if (clean.length !== 10 && clean.length !== 13) {
    return NextResponse.json({ error: "Invalid ISBN" }, { status: 400 });
  }

  const meta = (await fromGoogleBooks(clean)) ?? (await fromOpenLibrary(clean));
  if (!meta) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
  return NextResponse.json(meta);
}
