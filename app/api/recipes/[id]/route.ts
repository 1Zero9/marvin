import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/auth";
import { canManage, visibleTo } from "@/lib/privacy";
import { isPrivateBlobUrl, privateMediaToken } from "@/lib/media";
import { API_LIMITS, boundedStringList } from "@/lib/apiLimits";
import { InvalidRequestBodyError, objectBody, readJsonBody } from "@/lib/requestSecurity";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const recipe = await prisma.recipe.findFirst({ where: { id, householdId: identity.membership.householdId } });
  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  if (!canManage(identity, recipe.createdById)) return NextResponse.json({ error: "Only the owner or recipe creator can manage this recipe." }, { status: 403 });
  let body: Record<string, unknown> | null;
  try {
    body = objectBody(await readJsonBody(req, API_LIMITS.recipeJsonBytes));
  } catch (error) {
    if (error instanceof InvalidRequestBodyError) return NextResponse.json({ error: "Recipe data is missing or too large." }, { status: 413 });
    throw error;
  }
  const data: { title?: string; ingredients?: string | null; instructions?: string | null; notes?: string | null; tags?: string[]; visibility?: string; archived?: boolean } = {};
  if (body?.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 160) return NextResponse.json({ error: "Recipe names must be between 1 and 160 characters." }, { status: 400 });
    data.title = body.title.trim();
  }
  for (const field of ["ingredients", "instructions", "notes"] as const) {
    if (body?.[field] !== undefined) {
      if (typeof body[field] !== "string") return NextResponse.json({ error: `${field} must be text.` }, { status: 400 });
      const maximum = field === "ingredients" ? API_LIMITS.ingredientText : field === "instructions" ? API_LIMITS.instructionText : API_LIMITS.notes;
      if (body[field].length > maximum) return NextResponse.json({ error: `${field} is too long.` }, { status: 400 });
      data[field] = body[field].trim() || null;
    }
  }
  if (body?.tags !== undefined) {
    const tags = boundedStringList(body.tags, { maximumItems: 15, maximumLength: API_LIMITS.tag, lowercase: true });
    if (!tags) return NextResponse.json({ error: "Add no more than 15 tags of 40 characters each." }, { status: 400 });
    data.tags = tags;
  }
  if (body?.visibility === "private" || body?.visibility === "household") data.visibility = body.visibility;
  if (typeof body?.archived === "boolean") data.archived = body.archived;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  return NextResponse.json(await prisma.recipe.update({ where: { id }, data }));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const recipe = await prisma.recipe.findFirst({ where: { id, householdId: identity.membership.householdId }, include: { photos: true, cookLogs: { include: { photos: true } } } });
  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  if (!canManage(identity, recipe.createdById)) return NextResponse.json({ error: "Only the owner or recipe creator can delete this recipe." }, { status: 403 });
  const urls = [...recipe.photos, ...recipe.cookLogs.flatMap((log) => log.photos)].map((photo) => photo.url).filter(isPrivateBlobUrl);
  const token = urls.length ? privateMediaToken() : null;
  if (urls.length && !token) return NextResponse.json({ error: "Private media is not configured; this recipe cannot be deleted safely." }, { status: 503 });
  try {
    if (urls.length) await del(urls, { token: token ?? undefined });
    await prisma.$transaction(async (tx) => {
      await tx.photo.deleteMany({ where: { OR: [{ recipeId: id }, { cookLog: { recipeId: id } }] } });
      await tx.cookLog.deleteMany({ where: { recipeId: id } });
      await tx.recipe.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Couldn’t finish deleting this recipe. Please try again." }, { status: 503 });
  }
}
