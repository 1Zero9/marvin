import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const data: { favourite?: boolean; archived?: boolean } = {};
  if (typeof body?.favourite === "boolean") data.favourite = body.favourite;
  if (typeof body?.archived === "boolean") data.archived = body.archived;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  try {
    const found = await prisma.book.findFirst({ where: { id, householdId: identity.membership.householdId } });
    if (!found) throw new Error("not found");
    const book = await prisma.book.update({ where: { id }, data });
    return NextResponse.json(book);
  } catch {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  try {
    const found = await prisma.book.findFirst({ where: { id, householdId: identity.membership.householdId } });
    if (!found) throw new Error("not found");
    await prisma.book.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
}
