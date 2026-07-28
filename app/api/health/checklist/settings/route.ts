import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";

export async function PUT(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json();

  const labels = Array.isArray(body?.labels)
    ? body.labels.filter((l: unknown) => typeof l === "string" && l.trim()).map((l: string) => l.trim().slice(0, 60)).slice(0, 4)
    : null;
  if (!labels || labels.length === 0) {
    return NextResponse.json({ error: "Add at least one item" }, { status: 400 });
  }

  const userId = identity.user.id;
  const settings = await prisma.checklistSettings.upsert({
    where: { userId },
    update: { labels },
    create: { userId, labels },
  });
  return NextResponse.json(settings, { status: 201 });
}
