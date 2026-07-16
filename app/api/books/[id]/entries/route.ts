import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { canManage } from "@/lib/privacy";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const book = await prisma.book.findFirst({ where: { id, householdId: identity.membership.householdId } });
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
  if (!canManage(identity, book.createdById)) return NextResponse.json({ error: "Only the owner or creator can change this private book." }, { status: 403 });

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
