import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function runtimeDatabaseUrl(value: string | undefined) {
  if (!value) return undefined;

  try {
    const url = new URL(value);

    // Prisma Postgres direct connections are reserved for migrations and
    // admin tooling. Runtime traffic should use the pooled endpoint so Vercel
    // instances cannot exhaust the much smaller direct-connection allowance.
    if (url.hostname === "db.prisma.io") url.hostname = "pooled.db.prisma.io";

    if (url.hostname === "pooled.db.prisma.io" && !url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "2");
    }

    if (url.hostname === "pooled.db.prisma.io" && !url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "15");
    }

    return url.toString();
  } catch {
    return value;
  }
}

const datasourceUrl = runtimeDatabaseUrl(process.env.DATABASE_URL);

export const prisma = globalForPrisma.prisma ?? new PrismaClient(
  datasourceUrl ? { datasourceUrl } : undefined,
);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
