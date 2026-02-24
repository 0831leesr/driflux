"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Play } from "lucide-react"
import { formatViewerCountShort, getGameImageSrc, DEFAULT_STREAMING_IMAGE } from "@/lib/utils"
export interface VideoData {
  videoId: string
  videoTitle: string
  thumbnailImageUrl: string
  readCount: number
  channelName: string
  channelId: string
  /** Game cover for overlay (from parent game) */
  gameCover: string
  /** Game title for display */
  gameTitle: string
  /** Game ID for link (optional) */
  gameId?: number
}

export function VideoCard({
  video,
  onVideoClick,
  priority,
}: {
  video: VideoData
  onVideoClick?: (video: VideoData) => void
  priority?: boolean
}) {
  const gameCoverSrc = getGameImageSrc(video.gameCover, "cover")
  const initialThumbnail = video.thumbnailImageUrl || gameCoverSrc
  const [thumbnailSrc, setThumbnailSrc] = useState(initialThumbnail)
  const readCountDisplay = formatViewerCountShort(video.readCount)

  useEffect(() => {
    setThumbnailSrc(video.thumbnailImageUrl || gameCoverSrc)
  }, [video.thumbnailImageUrl, gameCoverSrc])

  const handleThumbnailError = () => {
    setThumbnailSrc((prev) =>
      prev === gameCoverSrc ? DEFAULT_STREAMING_IMAGE : gameCoverSrc
    )
  }

  const handleVideoClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest(".game-link")) {
      e.stopPropagation()
      return
    }
    onVideoClick?.(video)
  }

  return (
    <article
      className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-[hsl(var(--neon-purple))]/40 hover:shadow-lg hover:shadow-[hsl(var(--neon-purple))]/5"
      onClick={handleVideoClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onVideoClick?.(video)
      }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden">
        <Image
          src={thumbnailSrc}
          alt={`${video.channelName} - ${video.videoTitle}`}
          fill
          priority={priority}
          placeholder="empty"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(min-width: 872px) 25vw, 200px"
          unoptimized
          onError={handleThumbnailError}
        />

        {/* No LIVE badge - Video cards don't show LIVE */}

        {/* Read count badge (top left, like viewer count) */}
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 backdrop-blur-sm">
          <Play className="h-3 w-3 text-white" />
          <span className="text-[11px] font-semibold text-white">
            {readCountDisplay}
          </span>
        </div>

        {/* Game cover overlay - clickable to game details */}
        {video.gameId ? (
          <Link
            href={`/game/${video.gameId}`}
            className="game-link absolute -bottom-3 left-3 h-14 w-10 overflow-hidden rounded-md border-2 border-card shadow-lg transition-transform hover:scale-105 hover:border-[hsl(var(--neon-purple))]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={gameCoverSrc}
              alt={video.gameTitle}
              fill
              placeholder="empty"
              className="object-cover"
              sizes="40px"
              unoptimized
            />
          </Link>
        ) : (
          <div className="absolute -bottom-3 left-3 h-14 w-10 overflow-hidden rounded-md border-2 border-card shadow-lg">
            <Image
              src={gameCoverSrc}
              alt={video.gameTitle}
              fill
              placeholder="empty"
              className="object-cover"
              sizes="40px"
              unoptimized
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 pb-3 pt-5">
        <div className="mb-0.5 flex items-baseline gap-1.5">
          {video.gameId ? (
            <Link
              href={`/game/${video.gameId}`}
              className="game-link truncate text-base font-bold text-foreground hover:text-[hsl(var(--neon-purple))] transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {video.gameTitle}
            </Link>
          ) : (
            <h3 className="truncate text-base font-bold text-foreground">
              {video.gameTitle}
            </h3>
          )}
          <span className="shrink-0 text-xs text-muted-foreground">
            {video.channelName}
          </span>
        </div>
        <p className="truncate text-sm leading-snug text-secondary-foreground/70">
          {video.videoTitle}
        </p>
      </div>
    </article>
  )
}
