const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function hasExpectedMagicBytes(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mimeType === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/webp") return buffer.length >= 12 && buffer.subarray(0, 4).equals(Buffer.from("RIFF")) && buffer.subarray(8, 12).equals(Buffer.from("WEBP"));
  return false;
}

export function decodeImage(data: unknown, mimeType: unknown) {
  if (typeof data !== "string" || typeof mimeType !== "string") return null;
  const extension = IMAGE_TYPES.get(mimeType);
  if (!extension || data.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) return null;
  const buffer = Buffer.from(data, "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES || !hasExpectedMagicBytes(buffer, mimeType)) return null;
  return { buffer, mimeType, extension };
}
