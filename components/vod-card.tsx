"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Play, Bookmark } from "lucide-react"
import {
  formatReadCountKorean,
  formatDuration,
  getGameImageSrc,
  DEFAULT_STREAMING_IMAGE,
} from "@/lib/utils"
import { useFavoriteVideos } from "@/contexts/favorites-context"

export interface VodData {
  videoId: string
  videoTitle: string
  thumbnailImageUrl: string
  readCount: number
  channelName: string
  channelId: string
  gameCover: string
  gameTitle: string
  gameId?: number
  /** Duration in seconds (optional, from Chzzk API) */
  durationSeconds?: number | null
}

export interface VodCardProps {
  video: VodData
  onVideoClick?: (video: VodData) => void
  priority?: boolean
  /** Show bookmark button (default: true) */
  showBookmark?: boolean
}

export function VodCard({
  video,
  onVideoClick,
  priority = false,
  showBookmark = true,
}: VodCardProps) {
  const { isSaved, toggleSavedVideo } = useFavoriteVideos()
  const gameCoverSrc = getGameImageSrc(video.gameCover, "cover")
  const initialThumbnail = video.thumbnailImageUrl || gameCoverSrc
  const [thumbnailSrc, setThumbnailSrc] = useState(initialThumbnail)
  const readCountDisplay = formatReadCountKorean(video.readCount)
  const durationDisplay = formatDuration(video.durationSeconds)
  const isSavedVideo = isSaved(video.videoId)

  useEffect(() => {
    setThumbnailSrc(video.thumbnailImageUrl || gameCoverSrc)
  }, [video.thumbnailImageUrl, gameCoverSrc])

  const handleThumbnailError = () => {
    setThumbnailSrc((prev) =>
      prev === gameCoverSrc ? DEFAULT_STREAMING_IMAGE : gameCoverSrc
    )
  }

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleSavedVideo(video)
  }

  const handleVideoClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest(".vod-bookmark-btn")) {
      e.stopPropagation()
      return
    }
    onVideoClick?.(video)
  }

  return (
    <article
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl bg-neutral-900/60 transition-all hover:bg-neutral-800/60"
      onClick={handleVideoClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onVideoClick?.(video)
      }}
    >
      {/* Thumbnail - 16:9 */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl">
        <Image
          src={thumbnailSrc}
          alt={video.videoTitle}
          fill
          priority={priority}
          placeholder="empty"
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
          sizes="(min-width: 872px) 25vw, 200px"
          unoptimized
          onError={handleThumbnailError}
        />

        {/* Hover: Center play button with semi-transparent overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity duration-200 group-hover:bg-black/40 group-hover:opacity-100">
          <div className="flex flex-col items-center gap-1.5 rounded-lg bg-black/50 px-4 py-3">
            <Play className="h-8 w-8 fill-white text-white" />
            <span className="text-xs font-medium text-white">재생</span>
          </div>
        </div>

        {/* Top-right: Bookmark button */}
        {showBookmark && (
          <div className="absolute right-2 top-2">
            <button
              type="button"
              onClick={handleBookmarkClick}
              className="vod-bookmark-btn flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-colors hover:bg-black/60"
              aria-label={isSavedVideo ? "북마크 해제" : "북마크"}
            >
              <Bookmark
                className={`h-4 w-4 text-white ${
                  isSavedVideo ? "fill-current" : ""
                }`}
              />
            </button>
          </div>
        )}

        {/* Bottom-right: Duration */}
        <div className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-0.5">
          <span className="text-[11px] font-semibold text-white">
            {durationDisplay}
          </span>
        </div>
      </div>

      {/* Info area - flex flex-col mt-2 with padding */}
      <div className="mt-2 flex flex-col gap-0.5 p-3 pt-0">
        {/* First: Title (bold, line-clamp-2) */}
        <h3 className="line-clamp-2 text-sm font-bold text-neutral-100">
          {video.videoTitle || "다시보기"}
        </h3>

        {/* Second: streamer • game (gray) */}
        <p className="truncate text-xs text-neutral-500">
          {video.channelName} • {video.gameTitle}
        </p>

        {/* Third: 조회수 (lighter gray, smaller) */}
        <p className="text-[11px] text-neutral-600">
          조회수 {readCountDisplay}
        </p>
      </div>
    </article>
  )
}
