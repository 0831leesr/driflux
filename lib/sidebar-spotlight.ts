import { getTopLiveGames } from "@/lib/chzzk"
import {
  fetchAllGamesForHome,
  fetchTodayDailyGameStatsByGameIds,
  type TrendingGameRow,
} from "@/lib/data"
import { matchTopLiveGamesToTrendingRows, fetchAndMergeHomeGamesForTopLive } from "@/lib/match-top-live-games"

const SPOTLIGHT_LIMIT = 3

export type SidebarSpotlightGame = {
  id: number
  title: string
  cover_image_url: string | null
  header_image_url: string | null
  totalViewers: number
}

function toSpotlight(g: TrendingGameRow): SidebarSpotlightGame {
  return {
    id: g.id,
    title: g.title,
    cover_image_url: g.cover_image_url,
    header_image_url: g.header_image_url ?? null,
    totalViewers: g.totalViewers,
  }
}

/**
 * 좌측 사이드바 — 실시간 트렌딩·급상승 미니 목록 (홈 RichzemHome과 동일 파이프라인)
 */
export async function getSidebarSpotlightGames(): Promise<{
  trending: SidebarSpotlightGame[]
  rising: SidebarSpotlightGame[]
}> {
  const topLiveGames = await getTopLiveGames(50)
  const dbGames = await fetchAllGamesForHome()
  const dbGamesForLiveMatch = await fetchAndMergeHomeGamesForTopLive(topLiveGames, dbGames)
  const allMatchedLive = matchTopLiveGamesToTrendingRows(topLiveGames, dbGamesForLiveMatch)
  const todayStatsMap = await fetchTodayDailyGameStatsByGameIds(allMatchedLive.map((g) => g.id))

  const trendingLive: TrendingGameRow[] = allMatchedLive.map((g) => {
    const s = todayStatsMap.get(String(g.id))
    return {
      ...g,
      trend_score: s?.trend_score ?? 0,
      momentum_score: s?.momentum_score ?? 0,
    }
  })

  const trending = [...trendingLive]
    .sort((a, b) => (b.trend_score ?? 0) - (a.trend_score ?? 0))
    .slice(0, SPOTLIGHT_LIMIT)
    .map(toSpotlight)

  const rising = trendingLive
    .filter((g) => (g.momentum_score ?? 0) > 0)
    .sort((a, b) => (b.momentum_score ?? 0) - (a.momentum_score ?? 0))
    .slice(0, SPOTLIGHT_LIMIT)
    .map(toSpotlight)

  return { trending, rising }
}
