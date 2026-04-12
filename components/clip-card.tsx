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
  gameSlug?: string | null
  /** 치지직 API createdDate — 게시 시각 표시(다시보기 카드와 동일) */
  createdDate?: string | null
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
  const readCountDisplay = formatViewerCountShort(clip.readCount)
  const durationDisplay =
    clip.duration && clip.duration > 0 ? formatDuration(clip.duration) : null
  const publishLabel = formatVideoPublishDate(clip.createdDate)
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

        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/30">
          <div className="flex h-10 w-10 scale-75 items-center justify-center rounded-full bg-white/80 opacity-0 shadow-lg transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
            <Play className="ml-0.5 h-5 w-5 fill-neutral-900 text-neutral-900" />
          </div>
        </div>

        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 backdrop-blur-sm">
          <Play className="h-3 w-3 fill-white text-white" />
          <span className="text-[11px] font-semibold text-white">{readCountDisplay}</span>
        </div>

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
                className={`h-4 w-4 transition-all ${isClipSaved ? "fill-current" : ""}`}
              />
            </Button>
          </div>
        )}

        {durationDisplay && (
          <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5">
            <span className="text-[11px] font-semibold text-white">{durationDisplay}</span>
          </div>
        )}

        {clip.gameId ? (
          <Link
            href={gameHref({ id: clip.gameId, slug: clip.gameSlug })}
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

      <div className="px-3 pb-3 pt-5">
        <div className="mb-0.5 flex items-baseline gap-1.5">
          {clip.gameId ? (
            <Link
              href={gameHref({ id: clip.gameId, slug: clip.gameSlug })}
              className="game-link truncate text-sm font-bold text-foreground transition-colors hover:text-[hsl(var(--neon-purple))]"
              onClick={(e) => e.stopPropagation()}
            >
              {clip.gameTitle}
            </Link>
          ) : (
            <h3 className="truncate text-sm font-bold text-foreground">{clip.gameTitle}</h3>
          )}
          <span className="shrink-0 text-xs text-muted-foreground">{clip.channelName}</span>
        </div>
        <p className="truncate text-xs leading-snug text-secondary-foreground/70">
          {clip.clipTitle}
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
