"use client"

import { useState, useEffect } from "react"
import type { ReactNode } from "react"
import { VideoCard, type VideoData } from "@/components/video-card"
import { Button } from "@/components/ui/button"
import { fetchGamesByIds } from "@/lib/data"
import { getBestGameImage, getDisplayGameTitle } from "@/lib/utils"

const ROWS_PER_LOAD = 4
const CARDS_PER_ROW = 4
const CARDS_PER_LOAD = ROWS_PER_LOAD * CARDS_PER_ROW
const VIDEOS_PER_GAME = 20

interface FollowReplayGridProps {
  title: string
  icon: ReactNode
  gameIds: number[]
  onVideoClick?: (video: VideoData) => void
  emptyMessage?: string
}

export function FollowReplayGrid({
  title,
  icon,
  gameIds,
  onVideoClick,
  emptyMessage,
}: FollowReplayGridProps) {
  const [videos, setVideos] = useState<VideoData[]>([])
  const [loading, setLoading] = useState(true)
  const [displayCount, setDisplayCount] = useState(CARDS_PER_LOAD)

  useEffect(() => {
    setDisplayCount(CARDS_PER_LOAD)
  }, [videos])

  useEffect(() => {
    if (gameIds.length === 0) {
      setVideos([])
      setLoading(false)
      return
    }

    let aborted = false
    setLoading(true)

    async function loadVideos() {
      try {
        const games = await fetchGamesByIds(gameIds)
        const gamesWithCategory = games.filter(
          (g) => g.english_title && String(g.english_title).trim()
        )

        if (gamesWithCategory.length === 0) {
          if (!aborted) setVideos([])
          return
        }

        const videoMap = new Map<string, VideoData>()

        await Promise.all(
          gamesWithCategory.map(async (game) => {
            const categoryId = game.english_title!.trim()
            const gameCover = getBestGameImage(
              game.header_image_url,
              game.cover_image_url
            )
            const gameTitle = getDisplayGameTitle(game)

            const res = await fetch(
              `/api/chzzk/videos?categoryId=${encodeURIComponent(categoryId)}&size=${VIDEOS_PER_GAME}`
            )
            const data = await res.json()
            const items = data.videos ?? []

            for (const v of items) {
              const videoId = v.videoId ?? ""
              if (!videoId || videoMap.has(videoId)) continue

              videoMap.set(videoId, {
                videoId,
                videoTitle: v.videoTitle ?? "No Title",
                thumbnailImageUrl: v.thumbnailImageUrl ?? "",
                readCount: Number(v.readCount ?? 0),
                channelName: v.channel?.channelName ?? "Unknown",
                channelId: v.channel?.channelId ?? "",
                gameCover,
                gameTitle,
                gameId: game.id,
              })
            }
          })
        )

        const merged = Array.from(videoMap.values()).sort(
          (a, b) => b.readCount - a.readCount
        )

        if (!aborted) setVideos(merged)
      } catch (error) {
        console.error("Error loading follow replay videos:", error)
        if (!aborted) setVideos([])
      } finally {
        if (!aborted) setLoading(false)
      }
    }

    loadVideos()
    return () => {
      aborted = true
    }
  }, [gameIds.join(",")])

  const videosToShow = videos.slice(0, displayCount)
  const hasMore = videos.length > displayCount

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + CARDS_PER_LOAD)
  }

  if (gameIds.length === 0 && emptyMessage) {
    return (
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            {icon}
            {title}
          </h2>
        </div>
        <div className="flex flex-1 items-center justify-center rounded-xl border border-border bg-card/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      </section>
    )
  }

  if (loading) {
    return (
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            {icon}
            {title}
          </h2>
        </div>
        <div className="flex flex-1 items-center justify-center rounded-xl border border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">영상 목록을 불러오는 중...</p>
        </div>
      </section>
    )
  }

  if (videos.length === 0) {
    return (
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            {icon}
            {title}
          </h2>
        </div>
        <div className="flex flex-1 items-center justify-center rounded-xl border border-border bg-card/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            팔로우 중인 게임의 다시보기 영상이 없습니다.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          {icon}
          {title}
        </h2>
      </div>
      <div className="space-y-6">
        <div className="card-grid-4-wrapper -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="card-grid-4">
            {videosToShow.map((video, index) => (
              <VideoCard
                key={`${video.videoId}-${index}`}
                video={video}
                onVideoClick={onVideoClick}
                priority={index < 4}
              />
            ))}
          </div>
        </div>
        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="lg"
              onClick={handleLoadMore}
              className="min-w-[140px] border-border"
            >
              더 보기
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
