type LogValue = string | number | boolean | null | undefined;
type LogContext = Record<string, LogValue>;

export function requestIdFrom(request: Request) {
  const value = request.headers.get("x-request-id");
  return value && /^[a-zA-Z0-9-]{1,64}$/.test(value) ? value : undefined;
}

function write(level: "error" | "warn", event: string, error: unknown, context: LogContext) {
  const errorName = error instanceof Error ? error.name : typeof error;
  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...Object.fromEntries(Object.entries(context)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 200) : value])),
    error: { name: errorName },
  };
  const serialized = JSON.stringify(entry);
  if (level === "error") console.error(serialized);
  else console.warn(serialized);
}

export function logServerError(event: string, error: unknown, context: LogContext = {}) {
  write("error", event, error, context);
}

export function logServerWarning(event: string, error: unknown, context: LogContext = {}) {
  write("warn", event, error, context);
}
