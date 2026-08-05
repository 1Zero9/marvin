import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { currentMembership } from "@/lib/auth";
import { InvalidRequestBodyError, objectBody, readJsonBody } from "@/lib/requestSecurity";
import { enforceRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const maxDuration = 30;

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const DOCX_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // ZIP local file header, docx is a zip

export async function POST(req: Request) {
  const identity = await currentMembership();
  if (!identity) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const importLimit = await enforceRateLimit({ namespace: "import:file", identifier: identity.user.id, limit: 20, windowMs: 60 * 60 * 1000 });
  if (!importLimit.allowed) return rateLimitResponse(importLimit);

  let body: Record<string, unknown> | null;
  try {
    body = objectBody(await readJsonBody(req, 11 * 1024 * 1024));
  } catch (error) {
    if (error instanceof InvalidRequestBodyError) return NextResponse.json({ error: "That file is missing or too large" }, { status: 413 });
    throw error;
  }
  const data = typeof body?.data === "string" ? body.data : "";
  const filename = typeof body?.filename === "string" ? body.filename : "";
  if (!data || !/\.docx$/i.test(filename)) {
    return NextResponse.json({ error: "Only Word (.docx) files are supported here" }, { status: 400 });
  }
  if (data.length > Math.ceil((MAX_FILE_BYTES * 4) / 3) + 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
    return NextResponse.json({ error: "That file is too large" }, { status: 400 });
  }

  const buffer = Buffer.from(data, "base64");
  if (!buffer.length || buffer.length > MAX_FILE_BYTES || !buffer.subarray(0, 4).equals(DOCX_SIGNATURE)) {
    return NextResponse.json({ error: "That doesn't look like a valid .docx file" }, { status: 400 });
  }

  try {
    const { value: text } = await mammoth.extractRawText({ buffer });
    if (!text.trim()) {
      return NextResponse.json({ error: "Couldn't find any text in that file" }, { status: 422 });
    }
    return NextResponse.json({ text: text.trim().slice(0, 40000) });
  } catch {
    return NextResponse.json({ error: "Couldn't read that file" }, { status: 422 });
  }
}
