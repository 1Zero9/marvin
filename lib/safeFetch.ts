import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BODY_BYTES = 4 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 12000;

function isPrivateIPv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 0) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  return false;
}

function isPrivateIPv6(address: string) {
  const normalized = address.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fe80:")) return true; // link-local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local
  if (normalized.startsWith("::ffff:")) {
    return isPrivateIPv4(normalized.slice("::ffff:".length));
  }
  return false;
}

async function assertPublicHost(hostname: string) {
  const version = isIP(hostname);
  if (version === 4 && isPrivateIPv4(hostname)) throw new Error("That address isn't reachable");
  if (version === 6 && isPrivateIPv6(hostname)) throw new Error("That address isn't reachable");
  if (version) return;
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("That address isn't reachable");
  }
  const records = await lookup(hostname, { all: true });
  if (records.length === 0) throw new Error("That link couldn't be found");
  for (const record of records) {
    if (record.family === 4 && isPrivateIPv4(record.address)) throw new Error("That address isn't reachable");
    if (record.family === 6 && isPrivateIPv6(record.address)) throw new Error("That address isn't reachable");
  }
}

export type SafeFetchResult = { text: string; finalUrl: string; contentType: string };

/**
 * Fetches a user-supplied URL with basic SSRF protections: only http/https,
 * blocks requests that resolve to private/loopback/link-local addresses,
 * follows a limited number of redirects (re-checked at each hop), enforces
 * a timeout, and caps the response size.
 */
export async function fetchUrlSafely(rawUrl: string): Promise<SafeFetchResult> {
  let current = new URL(rawUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (current.protocol !== "http:" && current.protocol !== "https:") {
      throw new Error("Only http and https links are supported");
    }
    await assertPublicHost(current.hostname);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MarvinBot/1.0; +https://marvin app)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("That link redirected somewhere unusable");
      current = new URL(location, current);
      continue;
    }

    if (!res.ok) throw new Error(`That link returned an error (${res.status})`);

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html") && !contentType.includes("text")) {
      throw new Error("That link isn't a web page Marvin can read");
    }

    const reader = res.body?.getReader();
    if (!reader) return { text: await res.text(), finalUrl: current.toString(), contentType };
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.length;
        if (total > MAX_BODY_BYTES) {
          await reader.cancel().catch(() => {});
          throw new Error("That page is too large to read");
        }
        chunks.push(value);
      }
    }
    const text = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
    return { text, finalUrl: current.toString(), contentType };
  }
  throw new Error("That link redirected too many times");
}
