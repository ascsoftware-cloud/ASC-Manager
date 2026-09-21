/** Where invite / recovery emails should return after Supabase verifies the token. */
export function authCallbackPath(): string {
  return "/auth/callback";
}

/** Invite + reset redirect. Same origin as the tab so PKCE still matches. */
export function authCallbackUrl(origin?: string): string {
  const raw =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  let url = raw.trim().replace(/\/$/, "");
  if (!url) url = "http://localhost:8080";
  try {
    const parsed = new URL(url.includes("://") ? url : `https://${url}`);
    return `${parsed.origin}${authCallbackPath()}`;
  } catch {
    return `${url}${authCallbackPath()}`;
  }
}

/** If an auth email landed on the wrong path, send it to /auth/callback. */
export function authEmailCallbackTarget(href: string): string | null {
  const url = new URL(href, "https://manager.ascsoftware.co.za");
  if (url.pathname === authCallbackPath()) return null;
  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const hashParams = new URLSearchParams(hash);
  const type = url.searchParams.get("type") || hashParams.get("type") || "";
  const hasAuthPayload =
    url.searchParams.has("code") ||
    hashParams.has("access_token") ||
    hashParams.has("refresh_token") ||
    type === "recovery" ||
    type === "invite" ||
    type === "signup" ||
    type === "magiclink" ||
    type === "email";
  if (!hasAuthPayload) return null;
  return `${authCallbackPath()}${url.search}${url.hash}`;
}
