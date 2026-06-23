export const GROUP_SHARE_QUERY_PARAM = "id";
const LEGACY_SHARE_QUERY_PARAM = "is";

const DEFAULT_SHARE_ORIGIN = "https://badloggen.vercel.app";

export function buildGroupShareUrl(shareCode: string): string {
  const code = shareCode.trim().toUpperCase();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  if (typeof window === "undefined") {
    return `${DEFAULT_SHARE_ORIGIN}${basePath}/?${GROUP_SHARE_QUERY_PARAM}=${encodeURIComponent(code)}`;
  }

  return `${window.location.origin}${basePath}/?${GROUP_SHARE_QUERY_PARAM}=${encodeURIComponent(code)}`;
}

export function parseShareCodeFromInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const fromQuery =
      url.searchParams.get(GROUP_SHARE_QUERY_PARAM) ??
      url.searchParams.get(LEGACY_SHARE_QUERY_PARAM);
    if (fromQuery) return fromQuery.trim().toUpperCase();
  } catch {
    // Not a URL — treat as raw code
  }

  return trimmed.toUpperCase();
}

export function getShareCodeFromLocation(search: string): string | null {
  const params = new URLSearchParams(search);
  const code =
    params.get(GROUP_SHARE_QUERY_PARAM) ?? params.get(LEGACY_SHARE_QUERY_PARAM);
  return code ? code.trim().toUpperCase() : null;
}

export function stripShareCodeFromUrl(): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (
    !url.searchParams.has(GROUP_SHARE_QUERY_PARAM) &&
    !url.searchParams.has(LEGACY_SHARE_QUERY_PARAM)
  ) {
    return;
  }

  url.searchParams.delete(GROUP_SHARE_QUERY_PARAM);
  url.searchParams.delete(LEGACY_SHARE_QUERY_PARAM);
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", next || "/");
}
