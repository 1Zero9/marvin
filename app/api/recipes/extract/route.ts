import { NextResponse } from "next/server";
import { currentMembership } from "@/lib/auth";
import { decodeImage } from "@/lib/images";
import { aiProcessingAllowed } from "@/lib/privacy";
import { extractRecipe } from "@/lib/recipeExtraction";

export const maxDuration = 60;

export async function POST(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!aiProcessingAllowed(identity)) return NextResponse.json({ error: "AI processing is off in your privacy controls." }, { status: 403 });
  const body = await req.json();
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const images: { data?: string; mimeType?: string }[] = Array.isArray(body?.images)
    ? body.images.slice(0, 6)
    : [];
  const valid = images.flatMap((img) => {
    const decoded = decodeImage(img?.data, img?.mimeType);
    return decoded && typeof img.data === "string"
      ? [{ data: img.data, mimeType: decoded.mimeType, bytes: decoded.buffer.length }]
      : [];
  });
  if (valid.length === 0 && text.length < 20) {
    return NextResponse.json(
      { error: "Paste some recipe text or add a photo" },
      { status: 400 }
    );
  }
  if (text.length > 40000) {
    return NextResponse.json({ error: "Text too long" }, { status: 400 });
  }
  const totalBytes = valid.reduce((sum, img) => sum + img.bytes, 0);
  if (totalBytes > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "Images too large" }, { status: 400 });
  }

  const result = await extractRecipe(
    valid.length > 0 ? { images: valid } : { text }
  );
  if (!result) {
    return NextResponse.json(
      { error: "Couldn't read the recipe" },
      { status: 502 }
    );
  }
  if (!result.isRecipe) {
    return NextResponse.json(
      {
        error:
          valid.length > 0
            ? "That doesn't look like a recipe"
            : "That text doesn't look like a recipe",
      },
      { status: 422 }
    );
  }
  return NextResponse.json(result);
}
