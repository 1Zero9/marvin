import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { visibleTo } from "@/lib/privacy";
import { equivalentIsbns, normaliseIsbn } from "@/lib/isbn";

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
  const body = await req.json();
  const { isbn, title, author, coverUrl, pageCount, visibility } = body ?? {};
  const normalisedIsbn = normaliseIsbn(isbn);

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

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
      title,
      author: author || null,
      coverUrl: coverUrl || null,
      pageCount: typeof pageCount === "number" ? pageCount : null,
      householdId: identity.membership.householdId,
      createdById: identity.user.id,
      visibility: visibility === "household" ? "household" : "private",
    },
  });

  return NextResponse.json(book, { status: 201 });
}
