"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Eye, UserPlus, User } from "lucide-react"
import { formatViewerCountShort, getGameImageSrc, DEFAULT_STREAMING_IMAGE } from "@/lib/utils"
import { useFavoriteStreamers } from "@/contexts/favorites-context"

export interface StreamData {
  id: number
  thumbnail: string
  gameCover: string
  gameTitle: string
  streamTitle: string
  streamerName: string
  viewers: number
  viewersFormatted?: string
  isLive?: boolean
  saleDiscount?: string
  hasDrops?: boolean
  gameId?: number
  /** Chzzk channel ID for external link */
  channelId?: string | null
  /** Channel profile image URL */
  channelImageUrl?: string | null
  /** Direct URL (if provided, takes precedence over channelId) */
  url?: string | null
  rawData?: {
    streamCategory: string | null
    gameData: any
  }
}

export function StreamCard({
  stream,
  onStreamClick,
  priority,
}: {
  stream: StreamData
  onStreamClick?: (stream: StreamData) => void
  priority?: boolean
}) {
  const gameCoverSrc = getGameImageSrc(stream.gameCover, "cover")
  const initialThumbnail = stream.thumbnail || gameCoverSrc
  const [thumbnailSrc, setThumbnailSrc] = useState(initialThumbnail)
  const viewerDisplay = stream.viewersFormatted || formatViewerCountShort(stream.viewers)
  const isLive = stream.isLive !== false

  const profileImageUrl = stream.channelImageUrl?.trim() || null

  useEffect(() => {
    setThumbnailSrc(stream.thumbnail || gameCoverSrc)
  }, [stream.thumbnail, gameCoverSrc])

  const handleThumbnailError = () => {
    setThumbnailSrc((prev) =>
      prev === gameCoverSrc ? DEFAULT_STREAMING_IMAGE : gameCoverSrc
    )
  }

  const { isFavorite: isFollowingStreamer, toggleFavorite: toggleFollowStreamer } =
    useFavoriteStreamers()
  const hasChannelId = Boolean(stream.channelId?.trim())
  const isFollowing = hasChannelId && isFollowingStreamer(stream.channelId!)

  const handleStreamClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest(".game-link") || target.closest(".streamer-follow-btn")) {
      e.stopPropagation()
      return
    }
    onStreamClick?.(stream)
  }

  const handleFollowClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!hasChannelId) return
    toggleFollowStreamer({
      channelId: stream.channelId!,
      streamerName: stream.streamerName,
      channelImageUrl: stream.channelImageUrl ?? undefined,
    })
  }

  return (
    <article
      className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-[hsl(var(--neon-purple))]/40 hover:shadow-lg hover:shadow-[hsl(var(--neon-purple))]/5"
      onClick={handleStreamClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onStreamClick?.(stream)
      }}
    >
      {/* Thumbnail — 16:9 */}
      <div className="relative aspect-video w-full overflow-hidden">
        <Image
          src={thumbnailSrc}
          alt={`${stream.streamerName} - ${stream.gameTitle}`}
          fill
          priority={priority}
          placeholder="empty"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(min-width: 872px) 25vw, 200px"
          unoptimized
          onError={handleThumbnailError}
        />

        {/* Top-LEFT: blinking 🔴 LIVE badge */}
        {isLive && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-[hsl(var(--live-red))] px-2 py-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-white">
              LIVE
            </span>
          </div>
        )}

        {/* Bottom-RIGHT: viewer count */}
        {stream.viewers > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 backdrop-blur-sm">
            <Eye className="h-3 w-3 text-white" />
            <span className="text-[11px] font-semibold text-white">{viewerDisplay}</span>
          </div>
        )}

        {/* Bottom-LEFT: game cover mini thumbnail */}
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

      {/* Info — streamer profile image + title/meta */}
      <div className="flex items-start gap-2 px-3 pb-3 pt-5">
        {/* Streamer profile image */}
        <div className="mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
          {profileImageUrl ? (
            <Image
              src={profileImageUrl}
              alt={stream.streamerName}
              width={32}
              height={32}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Text info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            {stream.gameId ? (
              <Link
                href={`/game/${stream.gameId}`}
                className="game-link min-w-0 truncate text-sm font-bold text-foreground transition-colors hover:text-[hsl(var(--neon-purple))]"
                onClick={(e) => e.stopPropagation()}
              >
                {stream.gameTitle}
              </Link>
            ) : (
              <h3 className="min-w-0 truncate text-sm font-bold text-foreground">
                {stream.gameTitle}
              </h3>
            )}
            {hasChannelId && (
              <button
                type="button"
                aria-label={isFollowing ? "Unfollow" : "Follow"}
                className="streamer-follow-btn ml-auto shrink-0 inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-[hsl(var(--neon-purple))]/15 hover:text-[hsl(var(--neon-purple))]"
                onClick={handleFollowClick}
              >
                <UserPlus
                  className={`h-3.5 w-3.5 ${
                    isFollowing ? "fill-current text-[hsl(var(--neon-purple))]" : ""
                  }`}
                />
              </button>
            )}
          </div>

          <p className="truncate text-xs text-muted-foreground">{stream.streamerName}</p>

          <p className="mt-0.5 truncate text-xs leading-snug text-secondary-foreground/60">
            {stream.streamTitle}
          </p>

          {/* Badges */}
          {(stream.hasDrops || stream.saleDiscount) && (
            <div className="mt-1.5 flex flex-wrap gap-1">
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
      </div>
    </article>
  )
}
