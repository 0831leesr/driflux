"use client"

import { useRouter } from "next/navigation"
import { GameDetailsClient } from "@/components/game-details"
import type { GameRow } from "@/lib/data"
import type { StreamData } from "@/components/stream-card"
import type { VideoData } from "@/components/video-card"
import type { ClipData } from "@/components/clip-card"

interface GameDetailsPageProps {
  game: GameRow
  streams: StreamData[]
}

const CHZZK_LIVE_URL = "https://chzzk.naver.com/live"
const CHZZK_VIDEO_URL = "https://chzzk.naver.com/video"
const CHZZK_CLIP_URL = "https://chzzk.naver.com/clip"

export function GameDetailsPage({ game, streams }: GameDetailsPageProps) {
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
          onBack={handleBack}
          onStreamClick={handleStreamClick}
          onVideoClick={handleVideoClick}
          onClipClick={handleClipClick}
        />
      </main>
    </>
  )
}
