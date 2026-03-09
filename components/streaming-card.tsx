"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { User, UserPlus } from "lucide-react"
import {
  formatViewerCountShort,
  getGameImageSrc,
  DEFAULT_STREAMING_IMAGE,
} from "@/lib/utils"
import { useFavoriteStreamers } from "@/contexts/favorites-context"
import type { StreamData } from "@/components/stream-card"

export interface StreamingCardProps {
  stream: StreamData
  onStreamClick?: (stream: StreamData) => void
  priority?: boolean
}

export function StreamingCard({
  stream,
  onStreamClick,
  priority = false,
}: StreamingCardProps) {
  const gameCoverSrc = getGameImageSrc(stream.gameCover, "cover")
  const initialThumbnail = stream.thumbnail || gameCoverSrc
  const [thumbnailSrc, setThumbnailSrc] = useState(initialThumbnail)
  const viewerDisplay =
    stream.viewersFormatted || formatViewerCountShort(stream.viewers)
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
    if (
      target.closest(".game-link") ||
      target.closest(".streamer-follow-btn")
    ) {
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
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl bg-transparent transition-all hover:shadow-lg hover:shadow-black/20 hover:ring-2 hover:ring-[hsl(var(--neon-purple))]/30"
      onClick={handleStreamClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onStreamClick?.(stream)
      }}
    >
      {/* Thumbnail - 16:9 */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl">
        <Image
          src={thumbnailSrc}
          alt={`${stream.streamerName} - ${stream.streamTitle}`}
          fill
          priority={priority}
          placeholder="empty"
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          sizes="(min-width: 872px) 25vw, 200px"
          unoptimized
          onError={handleThumbnailError}
        />

        {/* Top-left: LIVE badge with pulse dot */}
        {isLive && (
          <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-1 shadow-lg">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-white"
              style={{
                animation: "streaming-live-pulse 1.5s ease-in-out infinite",
              }}
            />
            <span className="text-[11px] font-bold uppercase tracking-wide text-white">
              LIVE
            </span>
          </div>
        )}

        {/* Bottom-left: Viewer count */}
        {stream.viewers > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 backdrop-blur-sm">
            <User className="h-3 w-3 shrink-0 text-white" />
            <span className="text-[11px] font-semibold text-white">
              {viewerDisplay}
            </span>
          </div>
        )}

        {/* Bottom-right: Game name badge */}
        <div className="absolute bottom-2 right-2 max-w-[60%]">
          {stream.gameId ? (
            <Link
              href={`/game/${stream.gameId}`}
              className="game-link block truncate rounded-md bg-black/70 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm transition-opacity hover:bg-black/80"
              onClick={(e) => e.stopPropagation()}
            >
              {stream.gameTitle}
            </Link>
          ) : (
            <span className="block truncate rounded-md bg-black/70 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
              {stream.gameTitle}
            </span>
          )}
        </div>
      </div>

      {/* Info area - YouTube style */}
      <div className="mt-3 flex gap-3">
        {/* Left: Streamer profile */}
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-800">
          {profileImageUrl ? (
            <Image
              src={profileImageUrl}
              alt={stream.streamerName}
              fill
              className="object-cover"
              sizes="40px"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User className="h-5 w-5 text-neutral-500" />
            </div>
          )}
        </div>

        {/* Right: Title + streamer + follow */}
        <div className="min-w-0 flex-1">
          {/* Streaming title - max 2 lines */}
          <h3 className="line-clamp-2 text-sm font-bold text-white">
            {stream.streamTitle || "방송 중"}
          </h3>

          {/* Streamer name + follow button */}
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="truncate text-xs text-neutral-400">
              {stream.streamerName}
            </span>
            {hasChannelId && (
              <button
                type="button"
                aria-label={isFollowing ? "팔로우 해제" : "팔로우"}
                className="streamer-follow-btn inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-[hsl(var(--neon-purple))]/15 hover:text-[hsl(var(--neon-purple))]"
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
        </div>
      </div>
    </article>
  )
}
