import type { Metadata } from "next"
import { getGamesByTrendScore, fetchAllGamesForHome, getHistoricalTrending } from "@/lib/data"
import { matchTopLiveGamesToTrendingRows, fetchAndMergeHomeGamesForTopLive } from "@/lib/match-top-live-games"
import { getTopLiveGames } from "@/lib/chzzk"
import { TagDetailsPage } from "@/components/tag-details-page"

interface PageProps {
  params: Promise<{ tag: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag } = await params
  const tagName = decodeURIComponent(tag)

  return {
    title: `#${tagName} 트렌딩 게임 | Richzem`,
    description: `Richzem에서 ${tagName} 장르 게임의 트렌드와 실시간 라이브를 확인하세요.`,
  }
}

export default async function TagPage({ params }: PageProps) {
  const { tag } = await params
  const tagName = decodeURIComponent(tag)

  const [trendGames, topLiveGames, dbGames, yesterdayTrending] = await Promise.all([
    getGamesByTrendScore(tagName),       // DB: 이 태그를 가진 게임 트렌드 순
    getTopLiveGames(50),                 // Chzzk API: 현재 Top 50 라이브 (1회)
    fetchAllGamesForHome(),              // DB: 전체 게임 메타데이터 (캐싱됨)
    getHistoricalTrending("yesterday"),  // DB: 특징 태그 배지용 (캐싱됨)
  ])
  const yesterdayTrendingIds = yesterdayTrending.map((g) => g.id)

  const dbMerged = await fetchAndMergeHomeGamesForTopLive(topLiveGames, dbGames)

  // 현재 라이브 중인 게임 중 이 태그를 가진 것만 필터링
  const dbGamesWithThisTag = dbMerged.filter(
    (g) => Array.isArray(g.top_tags) && g.top_tags.includes(tagName)
  )
  // Top 50 라이브 중 해당 태그 게임만 매칭
  const hotLiveGames = matchTopLiveGamesToTrendingRows(topLiveGames, dbGamesWithThisTag)

  return (
    <TagDetailsPage
      tagName={tagName}
      trendGames={trendGames}
      hotLiveGames={hotLiveGames}
      yesterdayTrendingIds={yesterdayTrendingIds}
    />
  )
}
