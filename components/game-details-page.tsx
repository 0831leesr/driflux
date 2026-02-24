"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ExternalLink } from "lucide-react"
import { GameDetailsClient } from "@/components/game-details"
import type { GameRow } from "@/lib/data"
import type { StreamData } from "@/components/stream-card"
import type { VideoData } from "@/components/video-card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface GameDetailsPageProps {
  game: GameRow
  streams: StreamData[]
}

const CHZZK_LIVE_URL = "https://chzzk.naver.com/live"
const CHZZK_VIDEO_URL = "https://chzzk.naver.com/video"

export function GameDetailsPage({ game, streams }: GameDetailsPageProps) {
  const router = useRouter()
  const [streamModalOpen, setStreamModalOpen] = useState(false)
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [selectedStream, setSelectedStream] = useState<StreamData | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null)

  function handleBack() {
    router.back()
  }

  function handleStreamClick(stream: StreamData) {
    setSelectedStream(stream)
    setStreamModalOpen(true)
  }

  function handleVideoClick(video: VideoData) {
    setSelectedVideo(video)
    setVideoModalOpen(true)
  }

  function handleContinueToExternal() {
    const url = selectedStream?.url ?? (selectedStream?.channelId ? `${CHZZK_LIVE_URL}/${selectedStream.channelId}` : null)
    if (url) window.open(url, "_blank")
    setStreamModalOpen(false)
  }

  function handleContinueToVideo() {
    const url = selectedVideo?.videoId ? `${CHZZK_VIDEO_URL}/${selectedVideo.videoId}` : null
    if (url) window.open(url, "_blank")
    setVideoModalOpen(false)
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
        />
      </main>

      {/* Stream Modal */}
      <AlertDialog open={streamModalOpen} onOpenChange={setStreamModalOpen}>
        <AlertDialogContent className="border-border bg-card text-foreground">
          <AlertDialogHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--neon-purple))]/15">
              <ExternalLink className="h-6 w-6 text-[hsl(var(--neon-purple))]" />
            </div>
            <AlertDialogTitle className="text-foreground">
              Watch on External Site?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              You are being redirected to the streaming site (Chzzk). Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-secondary text-foreground hover:bg-secondary/80 hover:text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--neon-purple))]/80"
              onClick={handleContinueToExternal}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Video Modal */}
      <AlertDialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
        <AlertDialogContent className="border-border bg-card text-foreground">
          <AlertDialogHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--neon-purple))]/15">
              <ExternalLink className="h-6 w-6 text-[hsl(var(--neon-purple))]" />
            </div>
            <AlertDialogTitle className="text-foreground">
              Watch on External Site?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              You are being redirected to the streaming site (Chzzk) to watch this video. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-secondary text-foreground hover:bg-secondary/80 hover:text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--neon-purple))]/80"
              onClick={handleContinueToVideo}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
