/**
 * daily_game_stats 트렌드 집계 구간 — lib/data getHistoricalTrendingImpl과 동일
 * (data.ts는 "use server"만 허용하므로 순수 로직은 여기 둠)
 */
export type TrendingStatsPeriod = "yesterday" | "week" | "month"

export interface HistoricalTrendingRanges {
  yesterday: { start: string; end: string }
  week: { start: string; end: string }
  month: { start: string; end: string }
}

export function getHistoricalTrendingDateRange(
  period: TrendingStatsPeriod,
  referenceDate: Date = new Date()
): { start: string; end: string } {
  const yesterday = new Date(referenceDate)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  let startDateStr: string
  if (period === "yesterday") {
    startDateStr = yesterdayStr
  } else if (period === "week") {
    const d = new Date(referenceDate)
    d.setDate(d.getDate() - 7)
    startDateStr = d.toISOString().slice(0, 10)
  } else {
    const d = new Date(referenceDate)
    d.setDate(d.getDate() - 30)
    startDateStr = d.toISOString().slice(0, 10)
  }

  return { start: startDateStr, end: yesterdayStr }
}
