import type { Metadata } from "next"
import {
  getTopGameTags,
  getGamesByTrendScore,
  fetchAllGamesForHome,
  type HistoricalTrendingRow,
  type TagRow,
} from "@/lib/data"
import { getTopLiveGames } from "@/lib/chzzk"
import { buildExploreLiveItems, type ExploreLiveListItem } from "@/lib/match-top-live-games"
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

  if (mode === "live") {
    const [topLive, dbGames] = await Promise.all([
      getTopLiveGames(50),
      fetchAllGamesForHome(),
    ])
    exploreLiveItems = buildExploreLiveItems(topLive, dbGames)
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
    />
  )
}
