import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { canManage } from "@/lib/privacy";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const data: { title?: string; favourite?: boolean; archived?: boolean; visibility?: "private" | "household" } = {};
  if (typeof body?.title === "string") {
    const title = body.title.trim();
    if (!title || title.length > 160) {
      return NextResponse.json({ error: "Book names must be between 1 and 160 characters." }, { status: 400 });
    }
    data.title = title;
  } else if (body?.title !== undefined) {
    return NextResponse.json({ error: "Book name must be text." }, { status: 400 });
  }
  if (typeof body?.favourite === "boolean") data.favourite = body.favourite;
  if (typeof body?.archived === "boolean") data.archived = body.archived;
  if (body?.visibility === "private" || body?.visibility === "household") data.visibility = body.visibility;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  try {
    const found = await prisma.book.findFirst({ where: { id, householdId: identity.membership.householdId } });
    if (!found) throw new Error("not found");
    if (!canManage(identity, found.createdById)) return NextResponse.json({ error: "Only the owner or creator can change this private book." }, { status: 403 });
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
    if (!canManage(identity, found.createdById)) return NextResponse.json({ error: "Only the owner or creator can delete this private book." }, { status: 403 });
    await prisma.book.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
}
