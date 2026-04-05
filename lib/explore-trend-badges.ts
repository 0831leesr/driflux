import type { HistoricalTrendingRow } from "@/lib/data"
import type { ExploreLiveListItem } from "@/lib/match-top-live-games"
import { newReleaseDPlusForBadge } from "@/lib/release-date"

/** 트렌드 탐색 — URL `badges` 쿼리 및 카드 특징 필터 키 */
export type ExploreTrendBadgeKey = "trending" | "rising" | "new"

export const EXPLORE_TREND_BADGE_LABELS: Record<ExploreTrendBadgeKey, string> = {
  trending: "트렌딩",
  rising: "급상승",
  new: "신작",
}

const ALLOWED = new Set<string>(["trending", "rising", "new"])

export function parseExploreTrendBadgesParam(param: string | undefined): ExploreTrendBadgeKey[] {
  if (!param?.trim()) return []
  const out: ExploreTrendBadgeKey[] = []
  for (const part of param.split(",")) {
    const p = part.trim()
    if (ALLOWED.has(p)) out.push(p as ExploreTrendBadgeKey)
  }
  return out
}

export function serializeExploreTrendBadges(keys: ExploreTrendBadgeKey[]): string {
  return [...keys].sort().join(",")
}

/**
 * 트렌드 탐색 카드에 실제로 붙는 특징 배지와 동일한 규칙.
 * 여러 개 선택 시 AND(모두 만족하는 게임만 표시). 미선택이면 필터 없음.
 */
export function historicalTrendRowMatchesExploreBadges(
  game: HistoricalTrendingRow,
  filters: ExploreTrendBadgeKey[],
  ctx: {
    yesterdayTrendingIds: Set<number>
    risingGameIds: Set<number>
    isYesterdayPeriodTab: boolean
  },
): boolean {
  for (const f of filters) {
    if (f === "trending") {
      if (!(ctx.isYesterdayPeriodTab || ctx.yesterdayTrendingIds.has(game.id))) return false
    } else if (f === "rising") {
      if (!ctx.risingGameIds.has(game.id)) return false
    } else if (f === "new") {
      if (newReleaseDPlusForBadge(game.release_date ?? null) === undefined) return false
    }
  }
  return true
}

/**
 * 라이브 탐색 카드 특징 배지와 동일 규칙(DB 매칭 행 기준). 여러 개 선택 시 AND.
 */
export function exploreLiveItemMatchesExploreBadges(
  item: ExploreLiveListItem,
  filters: ExploreTrendBadgeKey[],
  ctx: {
    yesterdayTrendingIds: Set<number>
    risingGameIds: Set<number>
  },
): boolean {
  if (filters.length === 0) return true
  const db = item.db
  if (!db) return false
  for (const f of filters) {
    if (f === "trending") {
      if (!ctx.yesterdayTrendingIds.has(db.id)) return false
    } else if (f === "rising") {
      if (!ctx.risingGameIds.has(db.id)) return false
    } else if (f === "new") {
      if (newReleaseDPlusForBadge(db.release_date ?? null) === undefined) return false
    }
  }
  return true
}
