/**
 * KST(Asia/Seoul) 달력 기준 YYYY-MM-DD — daily_game_stats.record_date·트렌드 기간과 streamer_game_logs.log_date 정합
 */

export function formatKstDateString(referenceDate: Date = new Date()): string {
  return referenceDate.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" })
}

/** kstYmd(YYYY-MM-DD)를 KST 달력으로 deltaDays 만큼 이동한 날짜 문자열 */
export function addKstCalendarDays(kstYmd: string, deltaDays: number): string {
  const parts = kstYmd.split("-")
  if (parts.length !== 3) {
    throw new Error(`Invalid KST date: ${kstYmd}`)
  }
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  const utc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
  utc.setUTCDate(utc.getUTCDate() + deltaDays)
  const yy = utc.getUTCFullYear()
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(utc.getUTCDate()).padStart(2, "0")
  return `${yy}-${mm}-${dd}`
}
