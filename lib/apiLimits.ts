export const API_LIMITS = {
  identifier: 128,
  smallJsonBytes: 16 * 1024,
  recipeJsonBytes: 64 * 1024,
  title: 160,
  author: 160,
  ingredientText: 20_000,
  instructionText: 30_000,
  notes: 10_000,
  tag: 40,
  link: 2_048,
  page: 100_000,
} as const;

export function boundedText(value: unknown, maximum: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= maximum ? trimmed : null;
}

export function optionalBoundedText(value: unknown, maximum: number): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length <= maximum ? (trimmed || null) : undefined;
}

export function boundedStringList(
  value: unknown,
  options: { maximumItems: number; maximumLength: number; lowercase?: boolean },
) {
  if (!Array.isArray(value) || value.length > options.maximumItems) return null;
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (trimmed.length > options.maximumLength) return null;
    result.push(options.lowercase ? trimmed.toLowerCase() : trimmed);
  }
  return result;
}

export function isHttpUrl(value: string, maximum: number = API_LIMITS.link) {
  if (!value || value.length > maximum) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function booleanRecord(value: unknown, maximumKeys: number, maximumKeyLength: number) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length > maximumKeys) return null;
  if (entries.some(([key, checked]) => !key || key.length > maximumKeyLength || typeof checked !== "boolean")) return null;
  return Object.fromEntries(entries) as Record<string, boolean>;
}
