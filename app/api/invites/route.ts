import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (identity.membership.role !== "owner") return NextResponse.json({ error: "Only the household owner can invite people." }, { status: 403 });
  const body = await req.json();
  const email = typeof body?.email === "string" && body.email.trim()
    ? body.email.trim().toLowerCase()
    : null;
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email, or leave it blank for a shareable link." }, { status: 400 });
  const invite = await prisma.invite.create({
    data: {
      householdId: identity.membership.householdId,
      invitedById: identity.user.id,
      email,
      token: randomBytes(24).toString("base64url"),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });
  return NextResponse.json({ invite: { token: invite.token, expiresAt: invite.expiresAt, url: new URL(`/join/${invite.token}`, req.url).toString() } }, { status: 201 });
}
