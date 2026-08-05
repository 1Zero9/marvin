type RuntimeEnvironment = Partial<Pick<
  NodeJS.ProcessEnv,
  "APP_URL" | "VERCEL_PROJECT_PRODUCTION_URL" | "DATABASE_URL" | "PRIVATE_BLOB_READ_WRITE_TOKEN" | "NODE_ENV"
>>;

export function runtimeConfigurationIssues(environment: RuntimeEnvironment = process.env) {
  const issues: string[] = [];
  if (!environment.DATABASE_URL?.trim()) issues.push("DATABASE_URL is missing");
  if (!environment.PRIVATE_BLOB_READ_WRITE_TOKEN?.trim()) issues.push("PRIVATE_BLOB_READ_WRITE_TOKEN is missing");

  if (environment.NODE_ENV === "production") {
    const publicOrigin = environment.APP_URL?.trim()
      || environment.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    if (!publicOrigin) {
      issues.push("APP_URL is missing");
    } else {
      try {
        const value = publicOrigin.includes("://") ? publicOrigin : `https://${publicOrigin}`;
        if (new URL(value).protocol !== "https:") issues.push("APP_URL must use HTTPS");
      } catch {
        issues.push("APP_URL is invalid");
      }
    }
  }

  return issues;
}
