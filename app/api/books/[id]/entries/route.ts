import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const body = await req.json();
  const entries: { ingredient: string; dish: string; page: number }[] = (
    Array.isArray(body?.entries) ? body.entries : []
  ).filter(
    (e: { ingredient?: unknown; dish?: unknown; page?: unknown }) =>
      typeof e.ingredient === "string" &&
      e.ingredient.trim() &&
      typeof e.dish === "string" &&
      e.dish.trim() &&
      Number.isFinite(Number(e.page))
  );

  if (entries.length === 0) {
    return NextResponse.json({ error: "No valid entries" }, { status: 400 });
  }

  const result = await prisma.indexEntry.createMany({
    data: entries.map((e) => ({
      bookId: id,
      ingredient: e.ingredient.trim().toLowerCase(),
      dish: e.dish.trim(),
      page: Math.round(Number(e.page)),
    })),
  });

  return NextResponse.json({ count: result.count }, { status: 201 });
}
