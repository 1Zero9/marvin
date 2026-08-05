import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { canManage } from "@/lib/privacy";
import { API_LIMITS } from "@/lib/apiLimits";
import { InvalidRequestBodyError, objectBody, readJsonBody } from "@/lib/requestSecurity";

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

  let body: Record<string, unknown> | null;
  try {
    body = objectBody(await readJsonBody(req, 3 * 1024 * 1024));
  } catch (error) {
    if (error instanceof InvalidRequestBodyError) return NextResponse.json({ error: "Index entries are missing or too large." }, { status: 413 });
    throw error;
  }
  if (!Array.isArray(body?.entries) || body.entries.length === 0 || body.entries.length > 5_000) {
    return NextResponse.json({ error: "Add between 1 and 5,000 valid entries at a time." }, { status: 400 });
  }
  const entries = body.entries.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const entry = value as Record<string, unknown>;
    const ingredient = typeof entry.ingredient === "string" ? entry.ingredient.trim().toLowerCase() : "";
    const dish = typeof entry.dish === "string" ? entry.dish.trim() : "";
    const page = typeof entry.page === "number" ? entry.page : Number(entry.page);
    if (!ingredient || ingredient.length > 160 || !dish || dish.length > 300 || !Number.isInteger(page) || page < 1 || page > API_LIMITS.page) return [];
    return [{ ingredient, dish, page }];
  });

  if (entries.length !== body.entries.length) {
    return NextResponse.json({ error: "Every index entry needs a short ingredient, dish, and valid page number." }, { status: 400 });
  }

  const result = await prisma.indexEntry.createMany({
    data: entries.map((e) => ({
      bookId: id,
      ingredient: e.ingredient,
      dish: e.dish,
      page: e.page,
    })),
  });

  return NextResponse.json({ count: result.count }, { status: 201 });
}
