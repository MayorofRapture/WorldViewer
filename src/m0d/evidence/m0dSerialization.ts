function plainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function canonicalJson(value: unknown, path: string): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${path} must be finite`);
    return Object.is(value, -0) ? "0" : JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((child, index) => canonicalJson(child, `${path}[${index}]`)).join(",")}]`;
  if (plainRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key], `${path}.${key}`)}`).join(",")}}`;
  throw new TypeError(`${path} must contain only plain JSON data without undefined, functions, class instances, or binary/media objects`);
}

export function stableM0DJsonStringify(value: unknown): string {
  return canonicalJson(value, "value");
}

export function serializeM0DJson(value: unknown): string {
  return `${stableM0DJsonStringify(value)}\n`;
}

export function serializeM0DJsonLines(values: readonly unknown[]): string {
  return values.map((value, index) => canonicalJson(value, `line[${index}]`)).join("\n") + (values.length === 0 ? "" : "\n");
}

export function parseM0DJson<T>(text: string): T {
  const value: unknown = JSON.parse(text);
  return value as T;
}

export function parseM0DJsonLines<T>(text: string): T[] {
  if (text.trim() === "") return [];
  return text.split(/\r?\n/).filter((line) => line.trim().length > 0).map((line) => JSON.parse(line) as T);
}
