import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { fromDateInput, mondayOf, startOfDay } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

function weekStart(value: unknown) {
  if (typeof value !== "string") return null;
  const date = mondayOf(startOfDay(fromDateInput(value)));
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json();
  const startDate = weekStart(body?.weekStart);
  const ingredient = typeof body?.ingredient === "string" ? body.ingredient.trim() : "";
  const quantity = typeof body?.quantity === "string" ? body.quantity.trim() : "";
  if (!startDate || !ingredient || ingredient.length > 160 || quantity.length > 60) {
    return NextResponse.json({ error: "Add a valid item for this week." }, { status: 400 });
  }
  const item = await prisma.shoppingListItem.create({
    data: { userId: identity.user.id, weekStartDate: startDate, ingredient, quantity: quantity || null, source: "manual" },
  });
  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json();
  if (typeof body?.id !== "string" || typeof body?.checked !== "boolean") {
    return NextResponse.json({ error: "Invalid shopping item" }, { status: 400 });
  }
  const item = await prisma.shoppingListItem.findFirst({ where: { id: body.id, userId: identity.user.id }, select: { id: true } });
  if (!item) return NextResponse.json({ error: "Shopping item not found" }, { status: 404 });
  const updated = await prisma.shoppingListItem.update({ where: { id: item.id }, data: { checked: body.checked } });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json();
  if (typeof body?.id !== "string") return NextResponse.json({ error: "Invalid shopping item" }, { status: 400 });
  const deleted = await prisma.shoppingListItem.deleteMany({ where: { id: body.id, userId: identity.user.id } });
  if (deleted.count === 0) return NextResponse.json({ error: "Shopping item not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
