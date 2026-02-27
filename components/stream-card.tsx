"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Eye } from "lucide-react"
import { formatViewerCountShort, getGameImageSrc, DEFAULT_STREAMING_IMAGE } from "@/lib/utils"

export interface StreamData {
  id: number
  thumbnail: string
  gameCover: string
  gameTitle: string
  streamTitle: string
  streamerName: string
  viewers: number // Raw viewer count
  viewersFormatted?: string // Pre-formatted (optional)
  isLive?: boolean
  saleDiscount?: string
  hasDrops?: boolean
  gameId?: number
  /** Chzzk channel ID for external link: https://chzzk.naver.com/live/{channelId} */
  channelId?: string | null
  /** Direct URL (if provided, takes precedence over channelId) */
  url?: string | null
  rawData?: {
    streamCategory: string | null
    gameData: any
  }
}

export function StreamCard({ stream, onStreamClick, priority }: { stream: StreamData; onStreamClick?: (stream: StreamData) => void; priority?: boolean }) {
  const gameCoverSrc = getGameImageSrc(stream.gameCover, "cover")
  const initialThumbnail = stream.thumbnail || gameCoverSrc
  const [thumbnailSrc, setThumbnailSrc] = useState(initialThumbnail)
  const viewerDisplay = stream.viewersFormatted || formatViewerCountShort(stream.viewers)
  const isLive = stream.isLive !== false // Default to true if not specified

  useEffect(() => {
    setThumbnailSrc(stream.thumbnail || gameCoverSrc)
  }, [stream.thumbnail, gameCoverSrc])

  const handleThumbnailError = () => {
    // 썸네일 실패 시 게임 커버 이미지로 대체, 그것도 실패하면 기본 이미지
    setThumbnailSrc((prev) =>
      prev === gameCoverSrc ? DEFAULT_STREAMING_IMAGE : gameCoverSrc
    )
  }

  const handleStreamClick = (e: React.MouseEvent) => {
    // Check if click was on game-related elements
    const target = e.target as HTMLElement
    if (target.closest('.game-link')) {
      e.stopPropagation()
      return
    }
    onStreamClick?.(stream)
  }

  return (
    <article
      className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-[hsl(var(--neon-purple))]/40 hover:shadow-lg hover:shadow-[hsl(var(--neon-purple))]/5"
      onClick={handleStreamClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onStreamClick?.(stream) }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden">
        <Image
          src={thumbnailSrc}
          alt={`${stream.streamerName} streaming ${stream.gameTitle}`}
          fill
          priority={priority}
          placeholder="empty"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(min-width: 872px) 25vw, 200px"
          unoptimized
          onError={handleThumbnailError}
        />

        {/* Live indicator with viewer count */}
        {isLive && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-[hsl(var(--live-red))] px-2 py-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            <span className="text-[11px] font-bold text-white uppercase tracking-wide">
              LIVE
            </span>
          </div>
        )}

        {/* Viewer count badge */}
        {stream.viewers > 0 && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 backdrop-blur-sm">
            <Eye className="h-3 w-3 text-white" />
            <span className="text-[11px] font-semibold text-white">
              {viewerDisplay}
            </span>
          </div>
        )}

        {/* Game cover overlay - clickable to game details */}
        {stream.gameId ? (
          <Link 
            href={`/game/${stream.gameId}`}
            className="game-link absolute -bottom-3 left-3 h-14 w-10 overflow-hidden rounded-md border-2 border-card shadow-lg transition-transform hover:scale-105 hover:border-[hsl(var(--neon-purple))]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={gameCoverSrc}
              alt={stream.gameTitle}
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
              alt={stream.gameTitle}
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
          {stream.gameId ? (
            <Link
              href={`/game/${stream.gameId}`}
              className="game-link truncate text-base font-bold text-foreground hover:text-[hsl(var(--neon-purple))] transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {stream.gameTitle}
            </Link>
          ) : (
            <h3 className="truncate text-base font-bold text-foreground">
              {stream.gameTitle}
            </h3>
          )}
          <span className="shrink-0 text-xs text-muted-foreground">
            {stream.streamerName}
          </span>
        </div>
        <p className="mb-2 truncate text-sm leading-snug text-secondary-foreground/70">
          {stream.streamTitle}
        </p>

        {/* Data Badges: 드롭스 먼저, 할인율 다음 */}
        {(stream.hasDrops || stream.saleDiscount) && (
          <div className="flex flex-wrap gap-1">
            {stream.hasDrops && (
              <Badge className="border-transparent bg-emerald-500/15 px-1.5 py-0 text-[10px] font-medium text-emerald-400">
                드롭스
              </Badge>
            )}
            {stream.saleDiscount && (
              <Badge className="border-transparent bg-amber-500/15 px-1.5 py-0 text-[10px] font-medium text-amber-400">
                {stream.saleDiscount}
              </Badge>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
