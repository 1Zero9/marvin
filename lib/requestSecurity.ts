const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const REQUEST_LIMITS = {
  email: 254,
  password: 1024,
  displayName: 100,
  householdName: 100,
  token: 256,
  authJsonBytes: 16 * 1024,
} as const;

export class InvalidRequestBodyError extends Error {
  constructor(message = "Invalid request body") {
    super(message);
    this.name = "InvalidRequestBodyError";
  }
}

export function isValidEmail(value: string) {
  return value.length <= REQUEST_LIMITS.email && /^\S+@\S+\.\S+$/.test(value);
}

export function isValidPassword(value: string) {
  return value.length >= 10 && value.length <= REQUEST_LIMITS.password;
}

export function isBoundedText(value: string, maximum: number) {
  return value.length > 0 && value.length <= maximum;
}

export function objectBody(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export async function readJsonBody(request: Request, maximumBytes: number): Promise<unknown> {
  const suppliedLength = request.headers.get("content-length");
  if (suppliedLength && Number(suppliedLength) > maximumBytes) {
    throw new InvalidRequestBodyError("Request body is too large");
  }

  const reader = request.body?.getReader();
  if (!reader) throw new InvalidRequestBodyError();
  const decoder = new TextDecoder();
  let text = "";
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel().catch(() => undefined);
        throw new InvalidRequestBodyError("Request body is too large");
      }
      text += decoder.decode(value, { stream: true });
    }
  }
  text += decoder.decode();

  try {
    return JSON.parse(text);
  } catch {
    throw new InvalidRequestBodyError();
  }
}

export async function readJsonObject(request: Request, maximumBytes: number) {
  const body = objectBody(await readJsonBody(request, maximumBytes));
  if (!body) throw new InvalidRequestBodyError();
  return body;
}

function normalizedOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isAllowedMutationOrigin(
  method: string,
  requestUrl: string,
  originHeader: string | null,
  fetchSiteHeader: string | null = null,
) {
  if (SAFE_METHODS.has(method.toUpperCase())) return true;
  if (!originHeader) return fetchSiteHeader?.toLowerCase() !== "cross-site";
  const requestOrigin = normalizedOrigin(requestUrl);
  const suppliedOrigin = normalizedOrigin(originHeader);
  return Boolean(requestOrigin && suppliedOrigin && requestOrigin === suppliedOrigin);
}

export function publicAppUrl(
  path: string,
  requestUrl: string,
  environment: Partial<Pick<NodeJS.ProcessEnv, "APP_URL" | "VERCEL_PROJECT_PRODUCTION_URL" | "NODE_ENV">> = process.env,
) {
  const configured = environment.APP_URL?.trim();
  const vercelProductionHost = environment.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const base = configured
    || (vercelProductionHost
      ? (vercelProductionHost.includes("://") ? vercelProductionHost : `https://${vercelProductionHost}`)
      : null)
    || (environment.NODE_ENV !== "production" ? new URL(requestUrl).origin : null);

  if (!base) throw new Error("APP_URL is required in production to create public links safely");

  const parsedBase = new URL(base);
  if (environment.NODE_ENV === "production" && parsedBase.protocol !== "https:") {
    throw new Error("APP_URL must use HTTPS in production");
  }
  if (!(["http:", "https:"] as string[]).includes(parsedBase.protocol)) {
    throw new Error("APP_URL must be an HTTP(S) URL");
  }
  return new URL(path, parsedBase.origin).toString();
}
