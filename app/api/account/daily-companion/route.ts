import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.json({ showDailyCompanion: identity.user.showDailyCompanion });
}

export async function PATCH(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (typeof body?.showDailyCompanion !== "boolean") {
    return NextResponse.json({ error: "Choose whether My Day is shown." }, { status: 400 });
  }
  const user = await prisma.user.update({
    where: { id: identity.user.id },
    data: { showDailyCompanion: body.showDailyCompanion },
    select: { showDailyCompanion: true },
  });
  return NextResponse.json(user);
}
