import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeFoodExclusion } from "@/lib/foodPreferences";

export async function PATCH(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.foodExclusions)) return NextResponse.json({ error: "Invalid food preferences" }, { status: 400 });
  const submitted = body.foodExclusions as unknown[];
  const normalized = submitted
    .filter((value): value is string => typeof value === "string")
    .map(normalizeFoodExclusion)
    .filter((value): value is string => Boolean(value));
  const exclusions: string[] = Array.from(new Set(normalized)).slice(0, 30);
  const user = await prisma.user.update({
    where: { id: identity.user.id },
    data: { foodExclusions: exclusions },
    select: { foodExclusions: true },
  });
  return NextResponse.json(user);
}
