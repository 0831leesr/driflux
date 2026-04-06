"use client"

import { useState, useTransition, type ReactNode } from "react"
import { ExternalLink } from "lucide-react"
import type { StreamData } from "@/components/stream-card"
import type { VideoData } from "@/components/video-card"
import type { ClipData } from "@/components/clip-card"
import type { GameRow } from "@/lib/data"
import { useFavoriteGames } from "@/contexts/favorites-context"
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
import { GameHeader } from "@/components/game/game-header"
import { GameMedia } from "@/components/game/game-media"

export function GameDetailsClient({
  game,
  streams,
  totalViewers: totalViewersProp,
  liveStreamCount: liveStreamCountProp,
  onBack,
  onStreamClick,
  onVideoClick,
  onClipClick,
  evaluationsSlot,
  isYesterdayTrending,
  isRising,
}: {
  game: GameRow
  streams: StreamData[]
  totalViewers?: number
  liveStreamCount?: number
  isYesterdayTrending?: boolean
  isRising?: boolean
  onBack: () => void
  onStreamClick?: (stream: StreamData) => void
  onVideoClick?: (video: VideoData) => void
  onClipClick?: (clip: ClipData) => void
  /** 2단: 평가 및 리뷰(서버 컴포넌트 슬롯) */
  evaluationsSlot?: ReactNode
}) {
  const { isFavorite, toggleFavorite } = useFavoriteGames()
  const isFollowing = isFavorite(game.id)
  const [isPending, startTransition] = useTransition()
  const [steamModalOpen, setSteamModalOpen] = useState(false)

  const liveStreams = streams
  const headerViewers =
    totalViewersProp ?? liveStreams.reduce((sum, stream) => sum + (stream.viewers || 0), 0)
  const headerStreamCount = liveStreamCountProp ?? liveStreams.length
  const viewersFormatted =
    headerViewers >= 1000 ? `${(headerViewers / 1000).toFixed(1)}K` : String(headerViewers)

  const tags =
    game.top_tags && Array.isArray(game.top_tags) ? game.top_tags.slice(0, 5) : []

  const handleFollowClick = () => {
    startTransition(async () => {
      await toggleFavorite(game.id)
    })
  }

  const handleVisitStoreClick = () => {
    setSteamModalOpen(true)
  }

  const handleContinueToSteam = () => {
    if (game.steam_appid != null) {
      window.open(`https://store.steampowered.com/app/${game.steam_appid}`, "_blank")
    }
    setSteamModalOpen(false)
  }

  return (
    <div className="flex flex-col pb-8">
      <GameHeader
        game={game}
        headerStreamCount={headerStreamCount}
        viewersFormatted={viewersFormatted}
        tags={tags}
        isFollowing={isFollowing}
        isPending={isPending}
        onBack={onBack}
        onFollowClick={handleFollowClick}
        onVisitStoreClick={handleVisitStoreClick}
        isYesterdayTrending={isYesterdayTrending}
        isRising={isRising}
      />

      {evaluationsSlot}

      <GameMedia
        game={game}
        streams={streams}
        onStreamClick={onStreamClick}
        onVideoClick={onVideoClick}
        onClipClick={onClipClick}
      />

      <AlertDialog open={steamModalOpen} onOpenChange={setSteamModalOpen}>
        <AlertDialogContent className="border-border bg-card text-foreground">
          <AlertDialogHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--neon-purple))]/15">
              <ExternalLink className="h-6 w-6 text-[hsl(var(--neon-purple))]" />
            </div>
            <AlertDialogTitle className="text-foreground">Steam 스토어로 이동할까요?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Steam 스토어 페이지로 이동합니다. 계속하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-secondary text-foreground hover:bg-secondary/80 hover:text-foreground">
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--neon-purple))]/80"
              onClick={handleContinueToSteam}
            >
              이동
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
