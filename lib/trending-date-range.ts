/**
 * daily_game_stats 트렌드 집계 구간 — lib/data getHistoricalTrendingImpl과 동일
 * (data.ts는 "use server"만 허용하므로 순수 로직은 여기 둠)
 *
 * record_date는 KST 달력(Asia/Seoul)과 맞춤 — UTC 로컬 setDate + toISOString 혼용 시 하루 어긋남 방지
 */
import { addKstCalendarDays, formatKstDateString } from "@/lib/kst-dates"

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
  const kstToday = formatKstDateString(referenceDate)
  const yesterdayStr = addKstCalendarDays(kstToday, -1)

  let startDateStr: string
  if (period === "yesterday") {
    startDateStr = yesterdayStr
  } else if (period === "week") {
    startDateStr = addKstCalendarDays(kstToday, -7)
  } else {
    startDateStr = addKstCalendarDays(kstToday, -30)
  }

  return { start: startDateStr, end: yesterdayStr }
}
