import { sv } from "./sv";

export function t(
  key: string,
  params?: Record<string, string | number>
): string {
  const keys = key.split(".");
  let value: unknown = sv;

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }

  if (typeof value !== "string") return key;

  if (params) {
    return Object.entries(params).reduce(
      (str, [param, val]) => str.replace(`{${param}}`, String(val)),
      value
    );
  }

  return value;
}
