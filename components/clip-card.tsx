"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Play, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatViewerCountShort, getGameImageSrc, DEFAULT_STREAMING_IMAGE } from "@/lib/utils"
import { useFavoriteClips } from "@/contexts/favorites-context"

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export interface ClipData {
  clipUID: string
  clipTitle: string
  thumbnailImageUrl: string
  readCount: number
  duration: number
  channelName: string
  channelId: string
  /** Game cover for overlay (from parent game) */
  gameCover: string
  /** Game title for display */
  gameTitle: string
  /** Game ID for link (optional) */
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
  /** Hide save button (e.g. in Saved tab when removing is preferred) */
  showSaveButton?: boolean
}) {
  const { isSaved, toggleSavedClip } = useFavoriteClips()
  const gameCoverSrc = getGameImageSrc(clip.gameCover, "cover")
  const initialThumbnail = clip.thumbnailImageUrl || gameCoverSrc
  const [thumbnailSrc, setThumbnailSrc] = useState(initialThumbnail)
  const readCountDisplay = formatViewerCountShort(clip.readCount)
  const durationDisplay = formatDuration(clip.duration)
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
    if (target.closest(".game-link")) {
      e.stopPropagation()
      return
    }
    onClipClick?.(clip)
  }

  return (
    <article
      className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-[hsl(var(--neon-purple))]/40 hover:shadow-lg hover:shadow-[hsl(var(--neon-purple))]/5"
      onClick={handleClipClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClipClick?.(clip)
      }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden">
        <Image
          src={thumbnailSrc}
          alt={`${clip.channelName} - ${clip.clipTitle}`}
          fill
          priority={priority}
          placeholder="empty"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(min-width: 872px) 25vw, 200px"
          unoptimized
          onError={handleThumbnailError}
        />

        {/* Read count badge (top left) */}
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 backdrop-blur-sm">
          <Play className="h-3 w-3 text-white" />
          <span className="text-[11px] font-semibold text-white">
            {readCountDisplay}
          </span>
        </div>

        {/* Duration badge (bottom right) */}
        <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1 backdrop-blur-sm">
          <span className="text-[11px] font-semibold text-white">
            {durationDisplay}
          </span>
        </div>

        {/* Save button (top right) */}
        {showSaveButton && (
          <div className="absolute right-2 top-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSaveClick}
              className={`h-8 w-8 rounded-full backdrop-blur-sm transition-all ${
                isClipSaved
                  ? "bg-[hsl(var(--neon-purple))]/90 text-white hover:bg-[hsl(var(--neon-purple))]/80"
                  : "bg-black/40 text-white hover:bg-black/60"
              }`}
              aria-label={isClipSaved ? "저장 취소" : "저장"}
            >
              <Bookmark
                className={`h-4 w-4 transition-all ${
                  isClipSaved ? "fill-current" : ""
                }`}
              />
            </Button>
          </div>
        )}

        {/* Game cover overlay - clickable to game details */}
        {clip.gameId ? (
          <Link
            href={`/game/${clip.gameId}`}
            className="game-link absolute -bottom-3 left-3 h-14 w-10 overflow-hidden rounded-md border-2 border-card shadow-lg transition-transform hover:scale-105 hover:border-[hsl(var(--neon-purple))]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={gameCoverSrc}
              alt={clip.gameTitle}
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
              alt={clip.gameTitle}
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
          {clip.gameId ? (
            <Link
              href={`/game/${clip.gameId}`}
              className="game-link truncate text-base font-bold text-foreground hover:text-[hsl(var(--neon-purple))] transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {clip.gameTitle}
            </Link>
          ) : (
            <h3 className="truncate text-base font-bold text-foreground">
              {clip.gameTitle}
            </h3>
          )}
          <span className="shrink-0 text-xs text-muted-foreground">
            {clip.channelName}
          </span>
        </div>
        <p className="truncate text-sm leading-snug text-secondary-foreground/70">
          {clip.clipTitle}
        </p>
      </div>
    </article>
  )
}
