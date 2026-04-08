import { notFound } from "next/navigation"
import type { Metadata } from "next"
import {
  fetchGameById,
  fetchGameTopStreamersRow,
  fetchTodayDailyGameStatsByGameIds,
  getHistoricalTrending,
} from "@/lib/data"
import { getChzzkStreamsByCategory, getTopLiveGames } from "@/lib/chzzk"
import {
  getBestGameImage,
  getDisplayGameTitle,
  formatViewerCountShort,
  normalizeChzzkStreamerNameForMatch,
} from "@/lib/utils"
import { GameDetailsPage } from "@/components/game-details-page"
import { GameEvaluations } from "@/components/game/game-evaluations"
import type { StreamData } from "@/components/stream-card"
import type { GameDetailTopStreamer } from "@/lib/types"

// Revalidate every 60s — aligned with Chzzk live stream ISR cache
export const revalidate = 60

/** categoryId 정규화: 언더스코어↔공백 변환 후 소문자 비교 */
function normCategoryId(s: string) {
  return s.toLowerCase().replace(/_/g, " ").trim()
}

const TOP_STREAMER_PLACEHOLDER = "---"

/** 항상 3슬롯. DB/이름 없으면 "---", 라이브와 닉 일치 시 channelId·썸네일 우선, 없으면 DB 저장 프로필 URL */
function buildGameDetailTopStreamerSlots(
  row: Awaited<ReturnType<typeof fetchGameTopStreamersRow>>,
  streams: StreamData[],
): GameDetailTopStreamer[] {
  const names = row
    ? ([row.rank1_name, row.rank2_name, row.rank3_name] as const)
    : ([null, null, null] as const)
  const storedImages = row
    ? ([row.rank1_profile_image_url, row.rank2_profile_image_url, row.rank3_profile_image_url] as const)
    : ([null, null, null] as const)

  return names.map((name, i) => {
    const displayName = name?.trim() ? name.trim() : TOP_STREAMER_PLACEHOLDER
    if (displayName === TOP_STREAMER_PLACEHOLDER) {
      return {
        displayName: TOP_STREAMER_PLACEHOLDER,
        channelId: null,
        profileImageUrl: null,
      }
    }
    const live = streams.find(
      (st) =>
        normalizeChzzkStreamerNameForMatch(st.streamerName) ===
        normalizeChzzkStreamerNameForMatch(displayName),
    )
    const stored = storedImages[i]?.trim() || null
    const liveImg = live?.channelImageUrl?.trim() || null
    return {
      displayName,
      channelId: live?.channelId ?? null,
      profileImageUrl: liveImg || stored,
    }
  })
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

/**
 * 게임 상세 화면 구성(세로 순서):
 * 1. GameHeader — `GameDetailsClient` / `game-header.tsx` (타이틀·시청자·태그·팔로우)
 * 2. GameEvaluations — 점수 요약 + 스팀 인기 리뷰
 * 3. GameMedia — 라이브 / 다시보기 / 클립
 */
export default async function GamePage({ params }: PageProps) {
  const { id } = await params
  const gameId = parseInt(id, 10)

  if (isNaN(gameId) || gameId <= 0) notFound()

  const game = await fetchGameById(gameId)
  if (!game) notFound()

  const gameCover = getBestGameImage(game.header_image_url, game.cover_image_url)
  const gameTitle = getDisplayGameTitle(game)
  const categoryId = game.english_title?.trim() ?? ""

  const [chzzkStreams, topLiveGames, yesterdayTrending, topStreamersRow] = await Promise.all([
    categoryId ? getChzzkStreamsByCategory(categoryId) : Promise.resolve([]),
    getTopLiveGames(50),
    getHistoricalTrending("yesterday"),
    fetchGameTopStreamersRow(game.id),
  ])

  const isYesterdayTrending = yesterdayTrending.some((g) => g.id === game.id)
  const todayStatsMap = await fetchTodayDailyGameStatsByGameIds([game.id])
  const isRising = (todayStatsMap.get(String(game.id))?.momentum_score ?? 0) > 0

  const matchedLive = categoryId
    ? topLiveGames.find((g) => normCategoryId(g.categoryId) === normCategoryId(categoryId))
    : undefined

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
    channelImageUrl: s.channelImageUrl?.trim() || null,
  }))

  const topStreamers = buildGameDetailTopStreamerSlots(topStreamersRow, streams)

  return (
    <GameDetailsPage
      game={game}
      streams={streams}
      totalViewers={totalViewers}
      liveStreamCount={liveStreamCount}
      evaluationsSlot={<GameEvaluations game={game} />}
      isYesterdayTrending={isYesterdayTrending}
      isRising={isRising}
      topStreamers={topStreamers}
    />
  )
}
