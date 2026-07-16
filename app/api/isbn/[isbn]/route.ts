import { NextResponse } from "next/server";

type BookMeta = {
  isbn: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  pageCount: number | null;
};

function isbn13to10(isbn13: string): string | null {
  if (isbn13.length !== 13 || !isbn13.startsWith("978")) return null;
  const core = isbn13.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * Number(core[i]);
  const check = (11 - (sum % 11)) % 11;
  return core + (check === 10 ? "X" : String(check));
}

function isbn10to13(isbn10: string): string | null {
  if (isbn10.length !== 10) return null;
  const core = "978" + isbn10.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  return core + String((10 - (sum % 10)) % 10);
}

function candidatesFor(isbn: string): string[] {
  const alt = isbn.length === 13 ? isbn13to10(isbn) : isbn10to13(isbn);
  return alt ? [isbn, alt] : [isbn];
}

async function fromGoogleBooks(isbn: string, query?: string): Promise<BookMeta | null> {
  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query ?? `isbn:${isbn}`)}&maxResults=5`,
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

  let meta: BookMeta | null = null;
  for (const candidate of candidatesFor(clean)) {
    meta =
      (await fromGoogleBooks(candidate)) ??
      (await fromOpenLibrary(candidate)) ??
      (await fromGoogleBooks(candidate, candidate));
    if (meta) break;
  }
  if (!meta) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
  return NextResponse.json({ ...meta, isbn: clean });
}
