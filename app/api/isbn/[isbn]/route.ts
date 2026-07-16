import { NextResponse } from "next/server";

export const maxDuration = 30;

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

async function fromGemini(isbn: string): Promise<BookMeta | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const models = [
    process.env.GEMINI_MODEL || "gemini-flash-latest",
    "gemini-flash-lite-latest",
  ];
  try {
    let data: unknown = null;
    for (const model of models) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Search the web to identify the book with ISBN ${isbn}. Reply with ONLY a JSON object, no prose, no markdown fences: {"title": string, "author": string or null, "pageCount": number or null}. If you cannot confidently identify it, reply exactly {"title": null}.`,
                  },
                ],
              },
            ],
            tools: [{ google_search: {} }],
          }),
        }
      );
      if (res.ok) {
        data = await res.json();
        break;
      }
      if (res.status !== 429 && res.status !== 404) return null;
    }
    if (!data) return null;
    const text: string =
      (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
        ?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("") ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!parsed?.title || typeof parsed.title !== "string") return null;
    return {
      isbn,
      title: parsed.title,
      author: typeof parsed.author === "string" ? parsed.author : null,
      coverUrl: null,
      pageCount: typeof parsed.pageCount === "number" ? parsed.pageCount : null,
    };
  } catch {
    return null;
  }
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
  meta ??= await fromGemini(clean);
  if (!meta) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
  return NextResponse.json({ ...meta, isbn: clean });
}
