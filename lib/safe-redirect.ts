/**
 * OAuth `next` / post-login redirect: same-origin path only, blocks protocol-relative `//evil.com`.
 */
export function isSafeInternalRedirect(next: string | null | undefined): next is string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
}
