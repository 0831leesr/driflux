import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { fetchGameById } from "@/lib/data"
import { getChzzkStreamsByCategory, getTopLiveGames } from "@/lib/chzzk"
import { getBestGameImage, getDisplayGameTitle, formatViewerCountShort } from "@/lib/utils"
import { GameDetailsPage } from "@/components/game-details-page"
import type { StreamData } from "@/components/stream-card"

// Revalidate every 60s — aligned with Chzzk live stream ISR cache
export const revalidate = 60

/** categoryId 정규화: 언더스코어↔공백 변환 후 소문자 비교 */
function normCategoryId(s: string) {
  return s.toLowerCase().replace(/_/g, " ").trim()
}

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const gameId = parseInt(id, 10)

  if (isNaN(gameId) || gameId <= 0) {
    return { title: "게임을 찾을 수 없음" }
  }

  const game = await fetchGameById(gameId)
  if (!game) {
    return { title: "게임을 찾을 수 없음" }
  }

  const displayTitle = getDisplayGameTitle(game)
  const title = `${displayTitle} - Richzem 라이브`
  const description = `Richzem에서 ${displayTitle}의 실시간 방송, 다시보기, 클립을 확인하세요.`
  const ogImage = getBestGameImage(game.header_image_url, game.cover_image_url, "header")

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: displayTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function GamePage({ params }: PageProps) {
  const { id } = await params
  const gameId = parseInt(id, 10)

  if (isNaN(gameId) || gameId <= 0) notFound()

  const game = await fetchGameById(gameId)
  if (!game) notFound()

  const gameCover = getBestGameImage(game.header_image_url, game.cover_image_url)
  const gameTitle = getDisplayGameTitle(game)
  const categoryId = game.english_title?.trim() ?? ""

  // 방송 목록(페이징 20개)과 전체 카테고리 집계(Top 50)를 병렬로 패칭
  const [chzzkStreams, topLiveGames] = await Promise.all([
    categoryId ? getChzzkStreamsByCategory(categoryId) : Promise.resolve([]),
    getTopLiveGames(50),
  ])

  // 현재 게임을 Top Live 목록에서 매칭 (정규화 비교)
  const matchedLive = categoryId
    ? topLiveGames.find((g) => normCategoryId(g.categoryId) === normCategoryId(categoryId))
    : undefined

  // 헤더 통계: Top Live 집계 우선, 없으면 방송 목록 합산 (비주류 게임 fallback)
  const totalViewers =
    matchedLive?.concurrentUserCount ??
    chzzkStreams.reduce((sum, s) => sum + s.concurrentUserCount, 0)
  const liveStreamCount = matchedLive?.openLiveCount ?? chzzkStreams.length

  const streams: StreamData[] = chzzkStreams.map((s, i) => ({
    id: i + 1,
    thumbnail: s.liveImageUrl || gameCover,
    gameCover,
    gameTitle,
    streamTitle: s.liveTitle,
    streamerName: s.channelName,
    viewers: s.concurrentUserCount,
    viewersFormatted: formatViewerCountShort(s.concurrentUserCount),
    isLive: true,
    hasDrops: s.hasDrops,
    gameId: game.id,
    channelId: s.channelId,
    channelImageUrl: null,
  }))

  return (
    <GameDetailsPage
      game={game}
      streams={streams}
      totalViewers={totalViewers}
      liveStreamCount={liveStreamCount}
    />
  )
}
