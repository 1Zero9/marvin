import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { visibleTo } from "@/lib/privacy";
import { equivalentIsbns, normaliseIsbn } from "@/lib/isbn";
import { API_LIMITS, boundedText, isHttpUrl, optionalBoundedText } from "@/lib/apiLimits";
import { InvalidRequestBodyError, objectBody, readJsonBody } from "@/lib/requestSecurity";

export async function GET() {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const books = await prisma.book.findMany({
    where: { archived: false, householdId: identity.membership.householdId, ...visibleTo(identity) },
    orderBy: { title: "asc" },
    select: { id: true, title: true, author: true },
  });
  return NextResponse.json(books);
}

export async function POST(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  let body: Record<string, unknown> | null;
  try {
    body = objectBody(await readJsonBody(req, API_LIMITS.smallJsonBytes));
  } catch (error) {
    if (error instanceof InvalidRequestBodyError) return NextResponse.json({ error: "Cookbook data is missing or too large." }, { status: 413 });
    throw error;
  }
  const { isbn, title, author, coverUrl, pageCount, visibility } = body ?? {};
  const normalisedIsbn = normaliseIsbn(isbn);

  const cleanTitle = boundedText(title, API_LIMITS.title);
  const cleanAuthor = optionalBoundedText(author, API_LIMITS.author);
  const cleanCoverUrl = optionalBoundedText(coverUrl, API_LIMITS.link);
  if (!cleanTitle) {
    return NextResponse.json({ error: "Book names must be between 1 and 160 characters." }, { status: 400 });
  }
  if (cleanAuthor === undefined) return NextResponse.json({ error: "Author names must be 160 characters or fewer." }, { status: 400 });
  if (cleanCoverUrl === undefined || (cleanCoverUrl && !isHttpUrl(cleanCoverUrl))) return NextResponse.json({ error: "Cover image must use a valid HTTP(S) URL." }, { status: 400 });
  if (pageCount !== undefined && pageCount !== null && (typeof pageCount !== "number" || !Number.isInteger(pageCount) || pageCount < 1 || pageCount > API_LIMITS.page)) return NextResponse.json({ error: "Enter a valid page count." }, { status: 400 });

  if (isbn && !normalisedIsbn) {
    return NextResponse.json({ error: "Enter a valid 10- or 13-digit ISBN." }, { status: 400 });
  }

  if (normalisedIsbn) {
    const existing = await prisma.book.findFirst({ where: { isbn: { in: equivalentIsbns(normalisedIsbn) }, householdId: identity.membership.householdId } });
    if (existing) {
      return NextResponse.json({ error: "This cookbook is already in your kitchen.", existing: { id: existing.id, title: existing.title } }, { status: 409 });
    }
  }

  const book = await prisma.book.create({
    data: {
      isbn: normalisedIsbn,
      title: cleanTitle,
      author: cleanAuthor,
      coverUrl: cleanCoverUrl,
      pageCount: typeof pageCount === "number" ? pageCount : null,
      householdId: identity.membership.householdId,
      createdById: identity.user.id,
      visibility: visibility === "household" ? "household" : "private",
    },
  });

  return NextResponse.json(book, { status: 201 });
}
