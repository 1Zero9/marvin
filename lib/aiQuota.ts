import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rateLimit";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function configuredLimit(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 10_000) : fallback;
}

export async function enforceUserAiQuota(userId: string, units = 1) {
  const hourly = await enforceRateLimit({
    namespace: "ai:hourly",
    identifier: userId,
    limit: configuredLimit(process.env.AI_HOURLY_UNIT_LIMIT, 20),
    windowMs: HOUR_MS,
    cost: units,
  });
  if (!hourly.allowed) return hourly;

  return enforceRateLimit({
    namespace: "ai:daily",
    identifier: userId,
    limit: configuredLimit(process.env.AI_DAILY_UNIT_LIMIT, 60),
    windowMs: DAY_MS,
    cost: units,
  });
}

export function aiQuotaResponse(result: Awaited<ReturnType<typeof enforceUserAiQuota>>) {
  return NextResponse.json(
    { error: "Your AI processing allowance has been reached. Please wait before trying again." },
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
