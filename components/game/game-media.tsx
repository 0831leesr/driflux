"use client"

import { useState, useEffect } from "react"
import { Radio, Scissors, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { StreamCard, type StreamData } from "@/components/stream-card"
import { VideoCard, type VideoData } from "@/components/video-card"
import { ClipCard, type ClipData } from "@/components/clip-card"
import type { GameRow } from "@/lib/data"
import { sortChzzkVodList } from "@/lib/chzzk-vod-order"
import { getDisplayGameTitle, getBestGameImage } from "@/lib/utils"

async function fetchChzzkProxyJson(url: string, logLabel: string): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(url)
    const text = await res.text()
    if (!res.ok) {
      console.error(`[${logLabel}] HTTP ${res.status}:`, text)
      return {}
    }
    try {
      return JSON.parse(text) as Record<string, unknown>
    } catch (e) {
      console.error(`[${logLabel}] JSON parse failed:`, e, text)
      return {}
    }
  } catch (e) {
    console.error(`[${logLabel}]`, e)
    return {}
  }
}

const CHZZK_VOD_SORT_OPTIONS = [
  { id: "RECENT", label: "최신순" },
  { id: "POPULAR", label: "인기순" },
] as const

type ChzzkVodSortId = (typeof CHZZK_VOD_SORT_OPTIONS)[number]["id"]

function chzzkVodSortToApiParams(mode: ChzzkVodSortId): {
  filterType: "ALL"
  orderType: "POPULAR" | "RECENT"
} {
  return mode === "RECENT"
    ? { filterType: "ALL", orderType: "RECENT" }
    : { filterType: "ALL", orderType: "POPULAR" }
}

const CHZZK_CLIP_UNIFIED_FILTER_OPTIONS = [
  { id: "RECENT", label: "최신순" },
  { id: "POPULAR_24H", label: "24시간 인기순" },
  { id: "POPULAR_7D", label: "7일 인기순" },
  { id: "POPULAR_30D", label: "30일 인기순" },
  { id: "POPULAR_ALL", label: "전체 인기순" },
] as const

type ChzzkClipUnifiedFilterId = (typeof CHZZK_CLIP_UNIFIED_FILTER_OPTIONS)[number]["id"]

function chzzkClipUnifiedFilterToApiParams(mode: ChzzkClipUnifiedFilterId): {
  filterType: "WITHIN_THIRTY_DAYS" | "WITHIN_SEVEN_DAYS" | "WITHIN_ONE_DAY" | "ALL"
  orderType: "POPULAR" | "RECENT"
} {
  switch (mode) {
    case "RECENT":
      return { filterType: "ALL", orderType: "RECENT" }
    case "POPULAR_24H":
      return { filterType: "WITHIN_ONE_DAY", orderType: "POPULAR" }
    case "POPULAR_7D":
      return { filterType: "WITHIN_SEVEN_DAYS", orderType: "POPULAR" }
    case "POPULAR_30D":
      return { filterType: "WITHIN_THIRTY_DAYS", orderType: "POPULAR" }
    case "POPULAR_ALL":
      return { filterType: "ALL", orderType: "POPULAR" }
  }
}

function parseVodNextCursor(data: Record<string, unknown>): {
  publishDateAt: number
  readCount: number
} | null {
  const c = data.nextCursor
  if (!c || typeof c !== "object") return null
  const o = c as Record<string, unknown>
  const publishDateAt = Number(o.publishDateAt)
  const readCount = Number(o.readCount ?? 0)
  if (!Number.isFinite(publishDateAt)) return null
  if (!Number.isFinite(readCount)) return null
  return { publishDateAt, readCount }
}

function mapApiVideosToVideoData(
  items: unknown[],
  gameCover: string,
  gameTitle: string,
  gameId: number,
  gameSlug: string | null | undefined,
): VideoData[] {
  return items.map((raw) => {
    const v = raw as Record<string, unknown>
    const ch = v.channel as Record<string, unknown> | undefined
    const publishDateAtRaw = Number(v.publishDateAt)
    const livePvRaw = Number(v.livePv)
    return {
      videoId: String(v.videoId ?? ""),
      videoTitle: String(v.videoTitle ?? "제목 없음"),
      thumbnailImageUrl: String(v.thumbnailImageUrl ?? ""),
      readCount: Number(v.readCount ?? 0),
      duration: Number(v.duration ?? 0),
      publishDate: String(v.publishDate ?? ""),
      publishDateAt:
        Number.isFinite(publishDateAtRaw) && publishDateAtRaw > 0 ? publishDateAtRaw : undefined,
      livePv: Number.isFinite(livePvRaw) ? livePvRaw : 0,
      channelName: String(ch?.channelName ?? "알 수 없음"),
      channelId: String(ch?.channelId ?? ""),
      gameCover,
      gameTitle,
      gameId,
      gameSlug,
    }
  })
}

function mergeVideosDedupe(sorted: VideoData[]): VideoData[] {
  const byId = new Map<string, VideoData>()
  for (const v of sorted) {
    if (!v.videoId) continue
    byId.set(v.videoId, v)
  }
  return [...byId.values()]
}

function CardGridSkeleton({ count = 16 }: { count?: number }) {
  return (
    <div className="card-grid-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border bg-card animate-pulse">
          <div className="aspect-video w-full bg-muted" />
          <div className="p-3">
            <div className="mb-2 h-4 w-3/4 rounded bg-muted" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
              <div className="flex-1">
                <div className="mb-1 h-3 w-24 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

type TabType = "live" | "video" | "clip"

export type GameMediaProps = {
  game: GameRow
  streams: StreamData[]
  onStreamClick?: (stream: StreamData) => void
  onVideoClick?: (video: VideoData) => void
  onClipClick?: (clip: ClipData) => void
}

export function GameMedia({ game, streams, onStreamClick, onVideoClick, onClipClick }: GameMediaProps) {
  const [activeTab, setActiveTab] = useState<TabType>("live")
  const [videos, setVideos] = useState<VideoData[]>([])
  const [videosLoading, setVideosLoading] = useState(false)
  const [loadMoreLoading, setLoadMoreLoading] = useState(false)
  const [hasMoreVideos, setHasMoreVideos] = useState(true)
  const [videoNextCursor, setVideoNextCursor] = useState<{
    publishDateAt: number
    readCount: number
  } | null>(null)
  const [chzzkVodSort, setChzzkVodSort] = useState<ChzzkVodSortId>("POPULAR")

  const [clips, setClips] = useState<ClipData[]>([])
  const [clipsLoading, setClipsLoading] = useState(false)
  const [chzzkClipListFilter, setChzzkClipListFilter] =
    useState<ChzzkClipUnifiedFilterId>("POPULAR_30D")
  const [displayClipCount, setDisplayClipCount] = useState(16)
  const [displayStreamCount, setDisplayStreamCount] = useState(16)

  const liveStreams = streams
  const categoryId = game.english_title?.trim()
  const gameCover = getBestGameImage(game.header_image_url, game.cover_image_url)
  const gameTitle = getDisplayGameTitle(game)

  const VOD_FETCH_SIZE = 24
  const { filterType: vodFilterType, orderType: vodOrderType } = chzzkVodSortToApiParams(chzzkVodSort)
  const vodSortKey: "POPULAR" | "RECENT" = chzzkVodSort === "RECENT" ? "RECENT" : "POPULAR"
  const { filterType: clipFilterType, orderType: clipOrderType } =
    chzzkClipUnifiedFilterToApiParams(chzzkClipListFilter)

  useEffect(() => {
    if (activeTab !== "video" || !categoryId) return
    setVideos([])
    setVideoNextCursor(null)
    setHasMoreVideos(true)
    setVideosLoading(true)
    fetchChzzkProxyJson(
      `/api/chzzk/videos?categoryId=${encodeURIComponent(categoryId)}&size=${VOD_FETCH_SIZE}&filterType=${vodFilterType}&orderType=${vodOrderType}`,
      "GameMedia VOD"
    )
      .then((data) => {
        const items = (data.videos as unknown[] | undefined) ?? []
        const mapped = mapApiVideosToVideoData(items, gameCover, gameTitle, game.id, game.slug)
        setVideos(sortChzzkVodList(mapped, vodSortKey))
        const next = parseVodNextCursor(data)
        setVideoNextCursor(next)
        setHasMoreVideos(next != null && items.length > 0)
      })
      .finally(() => setVideosLoading(false))
  }, [activeTab, categoryId, gameCover, gameTitle, game.id, game.slug, chzzkVodSort])

  useEffect(() => {
    if (activeTab !== "clip" || !categoryId) return
    setClips([])
    setDisplayClipCount(16)
    setClipsLoading(true)
    fetchChzzkProxyJson(
      `/api/chzzk/clips?categoryId=${encodeURIComponent(categoryId)}&filterType=${clipFilterType}&orderType=${clipOrderType}&size=50`,
      "GameMedia Clips"
    )
      .then((data) => {
        const items = (data.clips as unknown[] | undefined) ?? []
        setClips(
          items.map((raw) => {
            const c = raw as Record<string, unknown>
            const owner = c.ownerChannel as Record<string, unknown> | undefined
            return {
              clipUID: String(c.clipUID ?? ""),
              clipTitle: String(c.clipTitle ?? "제목 없음"),
              thumbnailImageUrl: String(c.thumbnailImageUrl ?? ""),
              readCount: Number(c.readCount ?? 0),
              duration: Number(c.duration ?? 0),
              channelName: String(owner?.channelName ?? "알 수 없음"),
              channelId: String(owner?.channelId ?? c.ownerChannelId ?? ""),
              gameCover,
              gameTitle,
              gameId: game.id,
              gameSlug: game.slug ?? null,
              createdDate: String(c.createdDate ?? ""),
            }
          })
        )
      })
      .finally(() => setClipsLoading(false))
  }, [activeTab, categoryId, chzzkClipListFilter, gameCover, gameTitle, game.id, game.slug])

  const handleLoadMoreVideos = () => {
    if (!categoryId || loadMoreLoading || !hasMoreVideos || !videoNextCursor) return
    setLoadMoreLoading(true)
    const { publishDateAt, readCount } = videoNextCursor
    fetchChzzkProxyJson(
      `/api/chzzk/videos?categoryId=${encodeURIComponent(categoryId)}&size=${VOD_FETCH_SIZE}&filterType=${vodFilterType}&orderType=${vodOrderType}&publishDateAt=${publishDateAt}&readCount=${readCount}`,
      "GameMedia VOD load more"
    )
      .then((data) => {
        const items = (data.videos as unknown[] | undefined) ?? []
        const newVideos = mapApiVideosToVideoData(items, gameCover, gameTitle, game.id, game.slug)
        setVideos((prev) =>
          sortChzzkVodList(mergeVideosDedupe([...prev, ...newVideos]), vodSortKey)
        )
        const next = parseVodNextCursor(data)
        setVideoNextCursor(next)
        setHasMoreVideos(next != null && items.length > 0)
      })
      .finally(() => setLoadMoreLoading(false))
  }

  const handleLoadMoreClips = () => {
    setDisplayClipCount((prev) => prev + 16)
  }

  const displayedClips = clips.slice(0, displayClipCount)
  const hasMoreClips = clips.length > displayClipCount

  const displayedStreams = liveStreams.slice(0, displayStreamCount)
  const hasMoreStreams = liveStreams.length > displayStreamCount

  const handleLoadMoreStreams = () => {
    setDisplayStreamCount((prev) => prev + 16)
  }

  return (
    <section className="mx-4 my-8 lg:mx-6" aria-label="치지직 라이브·다시보기·클립">
      <Separator className="mb-8" />
      <div className="flex flex-col gap-6">
        <div className="flex gap-2 border-b border-border pb-2">
          <Button
            variant={activeTab === "live" ? "default" : "ghost"}
            size="sm"
            className={
              activeTab === "live"
                ? "bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--neon-purple))]/80"
                : "text-muted-foreground hover:text-foreground"
            }
            onClick={() => setActiveTab("live")}
          >
            <Radio className="mr-1.5 h-4 w-4" />
            라이브
          </Button>
          <Button
            variant={activeTab === "video" ? "default" : "ghost"}
            size="sm"
            className={
              activeTab === "video"
                ? "bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--neon-purple))]/80"
                : "text-muted-foreground hover:text-foreground"
            }
            onClick={() => setActiveTab("video")}
          >
            <Video className="mr-1.5 h-4 w-4" />
            다시보기
          </Button>
          <Button
            variant={activeTab === "clip" ? "default" : "ghost"}
            size="sm"
            className={
              activeTab === "clip"
                ? "bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--neon-purple))]/80"
                : "text-muted-foreground hover:text-foreground"
            }
            onClick={() => setActiveTab("clip")}
          >
            <Scissors className="mr-1.5 h-4 w-4" />
            클립
          </Button>
        </div>

        {activeTab === "video" && (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
            <div className="flex flex-wrap gap-1 rounded-lg border border-border p-0.5">
              {CHZZK_VOD_SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setChzzkVodSort(opt.id)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    chzzkVodSort === opt.id
                      ? "bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="max-w-xl text-xs leading-snug text-muted-foreground sm:text-right">
              현재 표시되는 다시보기 목록 내에서만 인기 정렬이 적용됩니다.
            </p>
          </div>
        )}

        {activeTab === "clip" && (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <div className="flex flex-wrap gap-1 rounded-lg border border-border p-0.5">
              {CHZZK_CLIP_UNIFIED_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setChzzkClipListFilter(opt.id)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    chzzkClipListFilter === opt.id
                      ? "bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "live" && (
          <div className="space-y-6">
            <div className="card-grid-4-wrapper -mx-4 px-4 lg:-mx-6 lg:px-6">
              <div className="card-grid-4">
                {displayedStreams.map((stream, i) => (
                  <StreamCard
                    key={`${stream.streamerName}-${i}`}
                    stream={stream}
                    onStreamClick={onStreamClick}
                    priority={i < 4}
                  />
                ))}
              </div>
            </div>
            {hasMoreStreams && liveStreams.length > 0 && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleLoadMoreStreams}
                  className="min-w-[140px] border-border"
                >
                  더 보기
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "video" && (
          <div className="space-y-6">
            <div className="card-grid-4-wrapper -mx-4 px-4 lg:-mx-6 lg:px-6">
              {!categoryId ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  이 게임의 다시보기 영상 정보를 불러올 수 없습니다.
                </p>
              ) : videosLoading ? (
                <CardGridSkeleton count={16} />
              ) : videos.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  아직 등록된 다시보기 영상이 없습니다.
                </p>
              ) : (
                <div className="card-grid-4">
                  {videos.map((video, i) => (
                    <VideoCard
                      key={`${video.videoId}-${i}`}
                      video={video}
                      onVideoClick={onVideoClick}
                      priority={i < 4}
                    />
                  ))}
                </div>
              )}
            </div>
            {hasMoreVideos && videoNextCursor != null && videos.length > 0 && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleLoadMoreVideos}
                  disabled={loadMoreLoading}
                  className="min-w-[140px] border-border"
                >
                  {loadMoreLoading ? "로딩 중..." : "더 보기"}
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "clip" && (
          <div className="space-y-6">
            <div className="card-grid-4-wrapper -mx-4 px-4 lg:-mx-6 lg:px-6">
              {!categoryId ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  이 게임의 클립 정보를 불러올 수 없습니다.
                </p>
              ) : clipsLoading ? (
                <CardGridSkeleton count={16} />
              ) : clips.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  아직 등록된 인기 클립이 없습니다.
                </p>
              ) : (
                <div className="card-grid-4">
                  {displayedClips.map((clip, i) => (
                    <ClipCard
                      key={`${clip.clipUID}-${i}`}
                      clip={clip}
                      onClipClick={onClipClick}
                      priority={i < 4}
                    />
                  ))}
                </div>
              )}
            </div>
            {hasMoreClips && clips.length > 0 && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleLoadMoreClips}
                  className="min-w-[140px] border-border"
                >
                  더 보기
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
