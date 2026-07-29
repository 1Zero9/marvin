import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json();
  if (typeof body?.aiProcessingEnabled !== "boolean") {
    return NextResponse.json({ error: "Choose whether AI processing is enabled." }, { status: 400 });
  }
  const user = await prisma.user.update({
    where: { id: identity.user.id },
    data: { aiProcessingEnabled: body.aiProcessingEnabled },
    select: { aiProcessingEnabled: true },
  });
  return NextResponse.json(user);
}
