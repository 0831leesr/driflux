"use client"

import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { GameDetailsClient } from "@/components/game-details"
import type { GameRow } from "@/lib/data"
import type { GameDetailTopStreamer } from "@/lib/types"
import type { StreamData } from "@/components/stream-card"
import type { VideoData } from "@/components/video-card"
import type { ClipData } from "@/components/clip-card"

interface GameDetailsPageProps {
  game: GameRow
  streams: StreamData[]
  /** 헤더에 표시할 전체 시청자 수 (Top Live API 집계값) */
  totalViewers?: number
  /** 헤더에 표시할 전체 방송 수 (Top Live API 집계값) */
  liveStreamCount?: number
  /** 평가·스팀 리뷰 섹션(서버 컴포넌트 슬롯, 헤더와 미디어 사이) */
  evaluationsSlot?: ReactNode
  isYesterdayTrending?: boolean
  isRising?: boolean
  /** TOP3 슬롯(부족 시 "---"), 미전달 시 헤더에서 "---"로 채움 */
  topStreamers?: GameDetailTopStreamer[]
}

const CHZZK_LIVE_URL = "https://chzzk.naver.com/live"
const CHZZK_VIDEO_URL = "https://chzzk.naver.com/video"
const CHZZK_CLIP_URL = "https://chzzk.naver.com/clips"

export function GameDetailsPage({
  game,
  streams,
  totalViewers,
  liveStreamCount,
  evaluationsSlot,
  isYesterdayTrending,
  isRising,
  topStreamers = [],
}: GameDetailsPageProps) {
  const router = useRouter()

  function handleBack() {
    router.back()
  }

  function handleStreamClick(stream: StreamData) {
    const url = stream?.url ?? (stream?.channelId ? `${CHZZK_LIVE_URL}/${stream.channelId}` : null)
    if (url) window.open(url, "_blank")
  }

  function handleVideoClick(video: VideoData) {
    const url = video?.videoId ? `${CHZZK_VIDEO_URL}/${video.videoId}` : null
    if (url) window.open(url, "_blank")
  }

  function handleClipClick(clip: ClipData) {
    const url = clip?.clipUID ? `${CHZZK_CLIP_URL}/${clip.clipUID}` : null
    if (url) window.open(url, "_blank")
  }

  return (
    <>
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <GameDetailsClient
          game={game}
          streams={streams}
          totalViewers={totalViewers}
          liveStreamCount={liveStreamCount}
          onBack={handleBack}
          onStreamClick={handleStreamClick}
          onVideoClick={handleVideoClick}
          onClipClick={handleClipClick}
          evaluationsSlot={evaluationsSlot}
          isYesterdayTrending={isYesterdayTrending}
          isRising={isRising}
          topStreamers={topStreamers}
        />
      </main>
    </>
  )
}
