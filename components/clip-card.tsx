"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Bookmark, Play } from "lucide-react"
import {
  formatDuration,
  formatCountCompactKorean,
  getGameImageSrc,
  DEFAULT_STREAMING_IMAGE,
} from "@/lib/utils"
import { useFavoriteClips } from "@/contexts/favorites-context"

export interface ClipData {
  clipUID: string
  clipTitle: string
  thumbnailImageUrl: string
  readCount: number
  duration: number
  channelName: string
  channelId: string
  gameCover: string
  gameTitle: string
  gameId?: number
}

export function ClipCard({
  clip,
  onClipClick,
  priority,
  showSaveButton = true,
}: {
  clip: ClipData
  onClipClick?: (clip: ClipData) => void
  priority?: boolean
  showSaveButton?: boolean
}) {
  const { isSaved, toggleSavedClip } = useFavoriteClips()
  const gameCoverSrc = getGameImageSrc(clip.gameCover, "cover")
  const initialThumbnail = clip.thumbnailImageUrl || gameCoverSrc
  const [thumbnailSrc, setThumbnailSrc] = useState(initialThumbnail)
  const durationDisplay = formatDuration(clip.duration)
  const readCountDisplay = formatCountCompactKorean(clip.readCount)
  const isClipSaved = isSaved(clip.clipUID)

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleSavedClip(clip)
  }

  useEffect(() => {
    setThumbnailSrc(clip.thumbnailImageUrl || gameCoverSrc)
  }, [clip.thumbnailImageUrl, gameCoverSrc])

  const handleThumbnailError = () => {
    setThumbnailSrc((prev) =>
      prev === gameCoverSrc ? DEFAULT_STREAMING_IMAGE : gameCoverSrc
    )
  }

  const handleClipClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest(".clip-bookmark-btn")) {
      e.stopPropagation()
      return
    }
    onClipClick?.(clip)
  }

  return (
    <article
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl bg-neutral-900/80 transition-all"
      onClick={handleClipClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClipClick?.(clip)
      }}
    >
      {/* Thumbnail - 16:9, overflow hidden for scale */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl">
        <Image
          src={thumbnailSrc}
          alt={clip.clipTitle}
          fill
          priority={priority}
          placeholder="empty"
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
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

        {/* Top-right: Bookmark */}
        {showSaveButton && (
          <div className="absolute right-2 top-2">
            <button
              type="button"
              onClick={handleSaveClick}
              className="clip-bookmark-btn flex h-7 w-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-colors hover:bg-black/60"
              aria-label={isClipSaved ? "북마크 해제" : "북마크"}
            >
              <Bookmark
                className={`h-3.5 w-3.5 text-white ${
                  isClipSaved ? "fill-current" : ""
                }`}
              />
            </button>
          </div>
        )}

        {/* Bottom-right: Duration */}
        <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5">
          <span className="text-[10px] font-semibold text-white">
            {durationDisplay}
          </span>
        </div>
      </div>

      {/* Info area - minimal, compact */}
      <div className="mt-2 min-w-0 px-0.5">
        {/* First line: Clip title - bold, truncate */}
        <h3 className="truncate text-xs font-bold text-neutral-100">
          {clip.clipTitle || "클립"}
        </h3>
        {/* Second line: ✂️ streamer • game • views - compact single line */}
        <p className="mt-0.5 truncate text-[10px] text-neutral-500">
          ✂️ {clip.channelName} • {clip.gameTitle} • 조회수 {readCountDisplay}
        </p>
      </div>
    </article>
  )
}
