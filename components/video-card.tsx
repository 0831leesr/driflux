"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Play, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  formatViewerCountShort,
  formatDuration,
  formatVideoPublishDate,
  getGameImageSrc,
  DEFAULT_STREAMING_IMAGE,
} from "@/lib/utils"
import { gameHref } from "@/lib/game-path"
import { useFavoriteVideos } from "@/contexts/favorites-context"

export interface VideoData {
  videoId: string
  videoTitle: string
  thumbnailImageUrl: string
  readCount: number
  /** Video duration in seconds (optional — shows badge when present) */
  duration?: number
  channelName: string
  channelId: string
  gameCover: string
  gameTitle: string
  gameId?: number
  gameSlug?: string | null
  /** 치지직 API publishDate (ISO) — 게시 시각 표시 */
  publishDate?: string | null
  /** API publishDateAt (ms) — 정렬 */
  publishDateAt?: number
  /** 인기순 보조 키 (라이브 VOD 등) */
  livePv?: number
}

export function VideoCard({
  video,
  onVideoClick,
  priority,
  showSaveButton = true,
}: {
  video: VideoData
  onVideoClick?: (video: VideoData) => void
  priority?: boolean
  showSaveButton?: boolean
}) {
  const { isSaved, toggleSavedVideo } = useFavoriteVideos()
  const gameCoverSrc = getGameImageSrc(video.gameCover, "cover")
  const initialThumbnail = video.thumbnailImageUrl || gameCoverSrc
  const [thumbnailSrc, setThumbnailSrc] = useState(initialThumbnail)
  const readCountDisplay = formatViewerCountShort(video.readCount)
  const durationDisplay = video.duration && video.duration > 0 ? formatDuration(video.duration) : null
  const publishLabel = formatVideoPublishDate(video.publishDate)
  const isVideoSaved = isSaved(video.videoId)

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleSavedVideo(video)
  }

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
      {/* Thumbnail — 16:9 */}
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

        {/* Hover play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/30">
          <div className="flex h-10 w-10 scale-75 items-center justify-center rounded-full bg-white/80 opacity-0 shadow-lg transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
            <Play className="ml-0.5 h-5 w-5 fill-neutral-900 text-neutral-900" />
          </div>
        </div>

        {/* Top-left: view count */}
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 backdrop-blur-sm">
          <Play className="h-3 w-3 fill-white text-white" />
          <span className="text-[11px] font-semibold text-white">{readCountDisplay}</span>
        </div>

        {/* Top-right: save button */}
        {showSaveButton && (
          <div className="absolute right-2 top-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSaveClick}
              className={`h-8 w-8 rounded-full backdrop-blur-sm transition-all ${
                isVideoSaved
                  ? "bg-[hsl(var(--neon-purple))]/90 text-white hover:bg-[hsl(var(--neon-purple))]/80"
                  : "bg-black/40 text-white hover:bg-black/60"
              }`}
              aria-label={isVideoSaved ? "저장 취소" : "저장"}
            >
              <Bookmark
                className={`h-4 w-4 transition-all ${isVideoSaved ? "fill-current" : ""}`}
              />
            </Button>
          </div>
        )}

        {/* Bottom-RIGHT: duration badge */}
        {durationDisplay && (
          <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5">
            <span className="text-[11px] font-semibold text-white">{durationDisplay}</span>
          </div>
        )}

        {/* Bottom-LEFT: game cover mini thumbnail */}
        {video.gameId ? (
          <Link
            href={gameHref({ id: video.gameId, slug: video.gameSlug })}
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
              href={gameHref({ id: video.gameId, slug: video.gameSlug })}
              className="game-link truncate text-sm font-bold text-foreground transition-colors hover:text-[hsl(var(--neon-purple))]"
              onClick={(e) => e.stopPropagation()}
            >
              {video.gameTitle}
            </Link>
          ) : (
            <h3 className="truncate text-sm font-bold text-foreground">{video.gameTitle}</h3>
          )}
          <span className="shrink-0 text-xs text-muted-foreground">{video.channelName}</span>
        </div>
        <p className="truncate text-xs leading-snug text-secondary-foreground/70">
          {video.videoTitle}
        </p>
        {publishLabel && (
          <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
            게시 {publishLabel}
          </p>
        )}
      </div>
    </article>
  )
}
