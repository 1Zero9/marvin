import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RateLimitOptions = {
  namespace: string;
  identifier: string;
  limit: number;
  windowMs: number;
  cost?: number;
};

type RateLimitRow = { count: number; expiresAt: Date };

function hashedBucketKey(namespace: string, identifier: string, windowStart: number) {
  return createHash("sha256")
    .update(`${namespace}:${identifier}:${windowStart}`)
    .digest("hex");
}

export function requestClientIdentifier(request: Request) {
  const forwarded = request.headers.get("x-vercel-forwarded-for")
    || request.headers.get("x-real-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0];
  return forwarded?.trim() || "unknown";
}

export async function enforceRateLimit({ namespace, identifier, limit, windowMs, cost = 1 }: RateLimitOptions) {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const expiresAt = new Date(windowStart + windowMs);
  const appliedCost = Math.max(1, Math.min(limit, Math.floor(cost)));
  const key = hashedBucketKey(namespace, identifier, windowStart);
  const rows = await prisma.$queryRaw<RateLimitRow[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "expiresAt")
    VALUES (${key}, ${appliedCost}, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET "count" = "RateLimitBucket"."count" + ${appliedCost}
    RETURNING "count", "expiresAt"
  `;
  const result = rows[0];

  // Keep the counter table bounded without adding a scheduled maintenance job.
  // The hash prefix makes cleanup occur for roughly one in every 64 buckets.
  if (Number.parseInt(key.slice(0, 2), 16) < 4) {
    await prisma.$executeRaw`DELETE FROM "RateLimitBucket" WHERE "expiresAt" < NOW()`;
  }

  return {
    allowed: result.count <= limit,
    limit,
    remaining: Math.max(0, limit - result.count),
    retryAfterSeconds: Math.max(1, Math.ceil((result.expiresAt.getTime() - now) / 1000)),
  };
}

type RequestRateLimitOptions = {
  request: Request;
  namespace: string;
  subject?: string;
  clientLimit: number;
  subjectLimit?: number;
  windowMs: number;
};

export async function enforceRequestRateLimit({
  request,
  namespace,
  subject,
  clientLimit,
  subjectLimit = clientLimit,
  windowMs,
}: RequestRateLimitOptions) {
  const checks = [
    enforceRateLimit({
      namespace: `${namespace}:client`,
      identifier: requestClientIdentifier(request),
      limit: clientLimit,
      windowMs,
    }),
  ];
  if (subject) {
    checks.push(enforceRateLimit({
      namespace: `${namespace}:subject`,
      identifier: subject,
      limit: subjectLimit,
      windowMs,
    }));
  }
  const results = await Promise.all(checks);
  return results.find((result) => !result.allowed) ?? results[0];
}

export function rateLimitResponse(result: Awaited<ReturnType<typeof enforceRateLimit>>) {
  return NextResponse.json(
    { error: "Too many attempts. Please wait and try again." },
    {
      status: 429,
      headers: {
        "Cache-Control": "private, no-store",
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    },
  );
}

export function enforceMediaUploadRateLimit(userId: string, cost = 1) {
  return enforceRateLimit({
    namespace: "media:upload",
    identifier: userId,
    limit: 30,
    windowMs: 60 * 60 * 1000,
    cost,
  });
}
