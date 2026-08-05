import { randomBytes, scrypt, timingSafeEqual } from "crypto";

function derivePassword(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await derivePassword(password, salt)).toString("hex");
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hash, extra] = stored.split(":");
  if (!salt || !hash || extra || !/^[a-f\d]{32}$/i.test(salt) || !/^[a-f\d]{128}$/i.test(hash)) return false;
  try {
    const [candidate, expected] = await Promise.all([
      derivePassword(password, salt),
      Promise.resolve(Buffer.from(hash, "hex")),
    ]);
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}
