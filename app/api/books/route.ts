import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";

export async function GET() {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const books = await prisma.book.findMany({
    where: { archived: false, householdId: identity.membership.householdId },
    orderBy: { title: "asc" },
    select: { id: true, title: true, author: true },
  });
  return NextResponse.json(books);
}

export async function POST(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json();
  const { isbn, title, author, coverUrl, pageCount } = body ?? {};

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (isbn) {
    const existing = await prisma.book.findFirst({ where: { isbn, householdId: identity.membership.householdId } });
    if (existing) {
      return NextResponse.json(existing);
    }
  }

  const book = await prisma.book.create({
    data: {
      isbn: isbn || null,
      title,
      author: author || null,
      coverUrl: coverUrl || null,
      pageCount: typeof pageCount === "number" ? pageCount : null,
      householdId: identity.membership.householdId,
    },
  });

  return NextResponse.json(book, { status: 201 });
}
