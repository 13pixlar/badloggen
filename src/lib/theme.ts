export type Theme = "default" | "summer";

export const THEME_STORAGE_KEY = "badloggen-theme";

export function isTheme(value: string | null): value is Theme {
  return value === "default" || value === "summer";
}
