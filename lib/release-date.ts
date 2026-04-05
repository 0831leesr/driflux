/** 신작 배지·섹션: KST 달력 기준 출시 후 최대 일수 (출시 당일 = 0) */
export const NEW_RELEASE_MAX_CALENDAR_DAYS = 30

function getKstYmd(now: Date): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" })
}

function ymdToUtcNoonMs(ymd: string): number {
  const [y, m, d] = ymd.split("-").map((p) => Number(p))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return NaN
  return Date.UTC(y, m - 1, d, 12, 0, 0)
}

/**
 * KST 달력 기준 출시일(YYYY-MM-DD)에서 오늘(KST)까지 경과 일수.
 * 출시일 당일 0, 하루 지나면 1. 파싱 불가 시 null.
 */
export function kstCalendarDaysSinceRelease(releaseYmd: string): number | null {
  const trimmed = releaseYmd.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null
  const rel = ymdToUtcNoonMs(trimmed)
  const today = ymdToUtcNoonMs(getKstYmd(new Date()))
  if (!Number.isFinite(rel) || !Number.isFinite(today)) return null
  return Math.round((today - rel) / 86_400_000)
}

/** 게임 카드 신작 배지용: 0…NEW_RELEASE_MAX_CALENDAR_DAYS 일 때만 D+값, 아니면 undefined */
export function newReleaseDPlusForBadge(releaseYmd: string | null | undefined): number | undefined {
  if (releaseYmd == null || releaseYmd === "") return undefined
  const d = kstCalendarDaysSinceRelease(releaseYmd)
  if (d === null || d < 0 || d > NEW_RELEASE_MAX_CALENDAR_DAYS) return undefined
  return d
}
