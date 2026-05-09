import type { Metadata } from "next"
import {
  getTopGameTags,
  getGamesByTrendPeriodForExplore,
  fetchAllGamesForHome,
  getHistoricalTrending,
  fetchTodayDailyGameStatsByGameIds,
  type HistoricalTrendingRow,
  type TagRow,
} from "@/lib/data"
import { getHistoricalTrendingDateRange, type HistoricalTrendingRanges } from "@/lib/trending-date-range"
import { getTopLiveGames } from "@/lib/chzzk"
import { buildExploreLiveItems, fetchAndMergeHomeGamesForTopLive, type ExploreLiveListItem } from "@/lib/match-top-live-games"
import { ExploreClient } from "@/components/explore/explore-client"
import { parseExploreTrendBadgesParam } from "@/lib/explore-trend-badges"

export const metadata: Metadata = {
  title: "게임 탐색 | Richzem",
  description: "실시간 라이브와 주간 트렌드로 게임을 발견하세요.",
}

export const dynamic = "force-dynamic"

const EXPLORE_TREND_PERIOD_VALUES = ["yesterday", "week", "month"] as const
type ExploreTrendPeriod = (typeof EXPLORE_TREND_PERIOD_VALUES)[number]

function parseExploreTrendPeriodParam(raw: string | undefined): ExploreTrendPeriod {
  if (raw && EXPLORE_TREND_PERIOD_VALUES.includes(raw as ExploreTrendPeriod)) {
    return raw as ExploreTrendPeriod
  }
  return "yesterday"
}

interface ExplorePageProps {
  searchParams: Promise<{ mode?: string; tags?: string; badges?: string; period?: string }>
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const { mode: modeParam, tags: tagsParam, badges: badgesParam, period: periodParam } =
    await searchParams
  const mode = modeParam === "trend" ? "trend" : "live"
  const initialTrendPeriod = mode === "trend" ? parseExploreTrendPeriodParam(periodParam) : "yesterday"
  const rawTag = tagsParam
    ? decodeURIComponent(tagsParam.split(",")[0].trim())
    : undefined
  const selectedTagName = rawTag || undefined
  const trendFeatureBadgeFilters = parseExploreTrendBadgesParam(badgesParam)

  let exploreLiveItems: ExploreLiveListItem[] = []
  let trendGamesYesterday: HistoricalTrendingRow[] = []
  let trendGamesWeek: HistoricalTrendingRow[] = []
  let trendGamesMonth: HistoricalTrendingRow[] = []
  let allTags: TagRow[] = []
  let risingGameIds: number[] = []

  // 어제 트렌딩 IDs — 모드 관계없이 항상 패치 (특징 태그 배지용)
  const yesterdayTrending = await getHistoricalTrending("yesterday")
  const yesterdayTrendingIds = yesterdayTrending.map((g) => g.id)

  if (mode === "live") {
    const [topLive, dbGamesBase] = await Promise.all([
      getTopLiveGames(48),
      fetchAllGamesForHome(),
    ])
    const dbGames = await fetchAndMergeHomeGamesForTopLive(topLive, dbGamesBase)
    exploreLiveItems = buildExploreLiveItems(topLive, dbGames)

    // 급상승 판별을 위한 오늘 stats 페치
    const matchedIds = exploreLiveItems.flatMap((item) => (item.db ? [item.db.id] : []))
    if (matchedIds.length > 0) {
      const todayStats = await fetchTodayDailyGameStatsByGameIds(matchedIds)
      risingGameIds = matchedIds.filter((id) => (todayStats.get(String(id))?.momentum_score ?? 0) > 0)
    }
  } else {
    const [yesterday, week, month, tags] = await Promise.all([
      getGamesByTrendPeriodForExplore("yesterday", selectedTagName),
      getGamesByTrendPeriodForExplore("week", selectedTagName),
      getGamesByTrendPeriodForExplore("month", selectedTagName),
      getTopGameTags(16),
    ])
    trendGamesYesterday = yesterday
    trendGamesWeek = week
    trendGamesMonth = month
    allTags = tags

    const trendIdSet = new Set<number>()
    for (const g of yesterday) trendIdSet.add(g.id)
    for (const g of week) trendIdSet.add(g.id)
    for (const g of month) trendIdSet.add(g.id)
    const trendUnionIds = [...trendIdSet]
    if (trendUnionIds.length > 0) {
      const todayStats = await fetchTodayDailyGameStatsByGameIds(trendUnionIds)
      risingGameIds = trendUnionIds.filter(
        (id) => (todayStats.get(String(id))?.momentum_score ?? 0) > 0,
      )
    }
  }

  const historicalTrendingRanges: HistoricalTrendingRanges = {
    yesterday: getHistoricalTrendingDateRange("yesterday"),
    week: getHistoricalTrendingDateRange("week"),
    month: getHistoricalTrendingDateRange("month"),
  }

  return (
    <ExploreClient
      initialMode={mode}
      initialTrendPeriod={initialTrendPeriod}
      exploreLiveItems={exploreLiveItems}
      trendGamesYesterday={trendGamesYesterday}
      trendGamesWeek={trendGamesWeek}
      trendGamesMonth={trendGamesMonth}
      historicalTrendingRanges={historicalTrendingRanges}
      allTags={allTags}
      selectedTagName={selectedTagName}
      yesterdayTrendingIds={yesterdayTrendingIds}
      risingGameIds={risingGameIds}
      trendFeatureBadgeFilters={trendFeatureBadgeFilters}
    />
  )
}
