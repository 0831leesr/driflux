import type { Metadata } from "next"
import {
  getTopGameTags,
  getGamesByTrendScore,
  fetchAllGamesForHome,
  getHistoricalTrending,
  fetchTodayDailyGameStatsByGameIds,
  type HistoricalTrendingRow,
  type TagRow,
} from "@/lib/data"
import { getTopLiveGames } from "@/lib/chzzk"
import { buildExploreLiveItems, fetchAndMergeHomeGamesForTopLive, type ExploreLiveListItem } from "@/lib/match-top-live-games"
import { ExploreClient } from "@/components/explore/explore-client"

export const metadata: Metadata = {
  title: "게임 탐색 | Richzem",
  description: "실시간 라이브와 주간 트렌드로 게임을 발견하세요.",
}

export const dynamic = "force-dynamic"

interface ExplorePageProps {
  searchParams: Promise<{ mode?: string; tags?: string }>
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const { mode: modeParam, tags: tagsParam } = await searchParams
  const mode = modeParam === "trend" ? "trend" : "live"
  const rawTag = tagsParam
    ? decodeURIComponent(tagsParam.split(",")[0].trim())
    : undefined
  const selectedTagName = rawTag || undefined

  let exploreLiveItems: ExploreLiveListItem[] = []
  let trendGames: HistoricalTrendingRow[] = []
  let allTags: TagRow[] = []
  let risingGameIds: number[] = []

  // 어제 트렌딩 IDs — 모드 관계없이 항상 패치 (특징 태그 배지용)
  const yesterdayTrending = await getHistoricalTrending("yesterday")
  const yesterdayTrendingIds = yesterdayTrending.map((g) => g.id)

  if (mode === "live") {
    const [topLive, dbGamesBase] = await Promise.all([
      getTopLiveGames(50),
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
    const [trendData, tags] = await Promise.all([
      getGamesByTrendScore(selectedTagName),
      getTopGameTags(16),
    ])
    trendGames = trendData
    allTags = tags
  }

  return (
    <ExploreClient
      initialMode={mode}
      exploreLiveItems={exploreLiveItems}
      trendGames={trendGames}
      allTags={allTags}
      selectedTagName={selectedTagName}
      yesterdayTrendingIds={yesterdayTrendingIds}
      risingGameIds={risingGameIds}
    />
  )
}
