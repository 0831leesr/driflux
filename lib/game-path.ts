/**
 * 게임 상세 URL — DB `games.slug` 우선(제목 기반), 없으면 `/game/{id}` (레거시·폴백).
 */

export function safeDecodePathSegment(raw: string): string {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

export function encodeGameUrlSegment(segment: string): string {
  return encodeURIComponent(segment)
}

export function gameHref(input: { id: number; slug?: string | null }): string {
  const s = input.slug?.trim()
  if (s) return `/game/${encodeGameUrlSegment(s)}`
  return `/game/${input.id}`
}

/** 현재 pathname이 해당 게임 상세인지 (사이드바 활성 등) */
export function gamePathnameMatches(
  pathname: string,
  game: { id: number; slug?: string | null },
): boolean {
  const m = /^\/game\/(.+)$/.exec(pathname)
  if (!m) return false
  const seg = safeDecodePathSegment(m[1])
  const s = game.slug?.trim()
  if (s) return seg === s
  return seg === String(game.id)
}
