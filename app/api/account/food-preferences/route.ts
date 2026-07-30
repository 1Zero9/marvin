import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FISH_AND_SEAFOOD } from "@/lib/foodPreferences";

export async function PATCH(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const exclusions = Array.isArray(body?.foodExclusions)
    ? body.foodExclusions.filter((value: unknown): value is string => value === FISH_AND_SEAFOOD)
    : null;
  if (!exclusions) return NextResponse.json({ error: "Invalid food preferences" }, { status: 400 });
  const user = await prisma.user.update({
    where: { id: identity.user.id },
    data: { foodExclusions: exclusions },
    select: { foodExclusions: true },
  });
  return NextResponse.json(user);
}
