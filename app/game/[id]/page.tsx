import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { fetchGameById } from "@/lib/data"
import { getChzzkStreamsByCategory } from "@/lib/chzzk"
import { getBestGameImage, getDisplayGameTitle, formatViewerCountShort } from "@/lib/utils"
import { GameDetailsPage } from "@/components/game-details-page"
import type { StreamData } from "@/components/stream-card"

// Revalidate every 60s — aligned with Chzzk live stream ISR cache
export const revalidate = 60

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const gameId = parseInt(id, 10)

  if (isNaN(gameId) || gameId <= 0) {
    return { title: "Game Not Found" }
  }

  const game = await fetchGameById(gameId)
  if (!game) {
    return { title: "Game Not Found" }
  }

  const displayTitle = getDisplayGameTitle(game)
  const title = `${displayTitle} - Live on Driflux`
  const description = `Driflux에서 ${displayTitle}의 실시간 방송, 다시보기, 클립을 확인하세요.`
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

  // Chzzk API에서 실시간 방송 목록 가져오기 (english_title = Chzzk 카테고리 ID)
  const chzzkStreams = categoryId
    ? await getChzzkStreamsByCategory(categoryId)
    : []

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

  return <GameDetailsPage game={game} streams={streams} />
}
