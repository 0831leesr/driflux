/**
 * Vercel/서버 로그용 — HTML 502 페이지·거대 본문을 잘라내고 cause 체인을 한 줄로 요약
 */
export function summarizeLogError(err: unknown, maxPlain = 480): string {
  const parts: string[] = []
  let e: unknown = err
  let depth = 0
  while (e != null && depth < 6) {
    if (e instanceof Error) {
      let m = e.message
      if (
        m.includes("<!DOCTYPE") ||
        m.includes("<html") ||
        m.includes("502: Bad gateway") ||
        m.includes("Bad gateway")
      ) {
        m = `[HTML/502 gateway page omitted, length=${m.length}]`
      } else if (m.length > maxPlain) {
        m = `${m.slice(0, maxPlain)}…`
      }
      parts.push(m)
      e = (e as Error & { cause?: unknown }).cause
    } else {
      parts.push(String(e))
      break
    }
    depth++
  }
  return parts.join(" ← ")
}
