import type { Metadata } from "next"
import {
  getTopGameTags,
  getGamesByTrendScore,
  fetchAllGamesForHome,
  matchTopLiveGamesToTrendingRows,
  type TrendingGameRow,
  type HistoricalTrendingRow,
  type TagRow,
} from "@/lib/data"
import { getTopLiveGames } from "@/lib/chzzk"
import { ExploreClient } from "@/components/explore/explore-client"

export const metadata: Metadata = {
  title: "게임 탐색 | Driflux",
  description: "실시간 라이브와 주간 트렌드로 게임을 발견하세요.",
}

export const dynamic = "force-dynamic"

interface ExplorePageProps {
  searchParams: { mode?: string; tags?: string }
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const mode = searchParams.mode === "trend" ? "trend" : "live"
  const rawTag = searchParams.tags
    ? decodeURIComponent(searchParams.tags.split(",")[0].trim())
    : undefined
  const selectedTagName = rawTag || undefined

  let liveGames: TrendingGameRow[] = []
  let trendGames: HistoricalTrendingRow[] = []
  let allTags: TagRow[] = []

  if (mode === "live") {
    const [topLive, dbGames] = await Promise.all([
      getTopLiveGames(50),
      fetchAllGamesForHome(),
    ])
    liveGames = matchTopLiveGamesToTrendingRows(topLive, dbGames)
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
      liveGames={liveGames}
      trendGames={trendGames}
      allTags={allTags}
      selectedTagName={selectedTagName}
    />
  )
}
