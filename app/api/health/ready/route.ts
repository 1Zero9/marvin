import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runtimeConfigurationIssues } from "@/lib/runtimeConfig";
import { logServerError, logServerWarning, requestIdFrom } from "@/lib/serverLog";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

async function databaseIsReady(requestId: string | undefined) {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Database readiness check timed out")), 3_000)),
    ]);
    return true;
  } catch (error) {
    logServerError("readiness.database_failed", error, { requestId });
    return false;
  }
}

export async function GET(request: Request) {
  const requestId = requestIdFrom(request);
  const configurationIssues = runtimeConfigurationIssues();
  if (configurationIssues.length) logServerWarning("readiness.configuration_incomplete", new Error("Configuration incomplete"), { requestId, issueCount: configurationIssues.length });
  const database = await databaseIsReady(requestId);
  const configuration = configurationIssues.length === 0;
  const ready = configuration && database;

  return NextResponse.json(
    { status: ready ? "ready" : "not_ready", checks: { configuration, database } },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
