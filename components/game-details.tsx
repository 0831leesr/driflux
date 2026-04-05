"use client"

import { useState, useEffect, useTransition } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Heart,
  ExternalLink,
  Radio,
  Tag,
  Users,
  Video,
  Scissors,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StreamCard, type StreamData } from "@/components/stream-card"
import { VideoCard, type VideoData } from "@/components/video-card"
import { ClipCard, type ClipData } from "@/components/clip-card"
import type { GameRow } from "@/lib/data"
import { sortChzzkVodList } from "@/lib/chzzk-vod-order"
import { getDisplayGameTitle, getBestGameImage } from "@/lib/utils"
import GameImage from "@/components/ui/game-image"
import { useFavoriteGames } from "@/contexts/favorites-context"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DonutChart } from "@/components/ui/donut-chart"

/* ── Helpers ── */
/** 치지직 프록시 API 응답 파싱 — 비정상 응답 시 로그 후 빈 객체로 안전 종료 */
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

/** 스팀 평가 표시 가능 여부: Overwhelmingly Positive ~ Overwhelmingly Negative만. NULL, "No user reviews", "N user reviews" 제외 */
function isValidSteamReview(game: { steam_review_desc?: string | null }): boolean {
  const desc = game.steam_review_desc?.trim()
  if (!desc) return false
  if (/^no user reviews$/i.test(desc)) return false
  if (/^\d+ user reviews?$/i.test(desc)) return false
  return true
}

/* ── 다시보기(v2 videos) 탭: 최신순 / 인기순만 (목록 내 클라이언트 정렬) ── */
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

/* ── 클립 탭 전용: 기간+정렬 통합 필터 ── */
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
  gameId: number
): VideoData[] {
  return items.map((v: any) => {
    const publishDateAtRaw = Number(v.publishDateAt)
    const livePvRaw = Number(v.livePv)
    return {
      videoId: v.videoId ?? "",
      videoTitle: v.videoTitle ?? "제목 없음",
      thumbnailImageUrl: v.thumbnailImageUrl ?? "",
      readCount: Number(v.readCount ?? 0),
      duration: Number(v.duration ?? 0),
      publishDate: v.publishDate ?? "",
      publishDateAt:
        Number.isFinite(publishDateAtRaw) && publishDateAtRaw > 0 ? publishDateAtRaw : undefined,
      livePv: Number.isFinite(livePvRaw) ? livePvRaw : 0,
      channelName: v.channel?.channelName ?? "알 수 없음",
      channelId: v.channel?.channelId ?? "",
      gameCover,
      gameTitle,
      gameId,
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

/* ── Skeleton: 메인/탐색 화면처럼 고스트 로딩 카드 ── */
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

/* ── Main Game Details Component ── */
type TabType = "live" | "video" | "clip"

export function GameDetailsClient({
  game,
  streams,
  totalViewers: totalViewersProp,
  liveStreamCount: liveStreamCountProp,
  onBack,
  onStreamClick,
  onVideoClick,
  onClipClick,
}: {
  game: GameRow
  streams: StreamData[]
  /** Top Live API 집계 시청자 수 (있으면 헤더에 우선 사용) */
  totalViewers?: number
  /** Top Live API 집계 방송 수 (있으면 헤더에 우선 사용) */
  liveStreamCount?: number
  onBack: () => void
  onStreamClick?: (stream: StreamData) => void
  onVideoClick?: (video: VideoData) => void
  onClipClick?: (clip: ClipData) => void
}) {
  const { isFavorite, toggleFavorite } = useFavoriteGames()
  const isFollowing = isFavorite(game.id)
  const [isPending, startTransition] = useTransition()
  const [steamModalOpen, setSteamModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>("live")
  const [videos, setVideos] = useState<VideoData[]>([])
  const [videosLoading, setVideosLoading] = useState(false)
  const [loadMoreLoading, setLoadMoreLoading] = useState(false)
  const [hasMoreVideos, setHasMoreVideos] = useState(true)
  /** 치지직 v2 videos 다음 페이지 커서(offset 미지원) */
  const [videoNextCursor, setVideoNextCursor] = useState<{
    publishDateAt: number
    readCount: number
  } | null>(null)
  const [chzzkVodSort, setChzzkVodSort] = useState<ChzzkVodSortId>("POPULAR")

  const [clips, setClips] = useState<ClipData[]>([])
  const [clipsLoading, setClipsLoading] = useState(false)
  const [chzzkClipListFilter, setChzzkClipListFilter] =
    useState<ChzzkClipUnifiedFilterId>("POPULAR_30D")
  const [displayClipCount, setDisplayClipCount] = useState(16) // 4 rows × 4 cols
  const [displayStreamCount, setDisplayStreamCount] = useState(16) // 4 rows × 4 cols (시청자 기준 16개 우선 로딩)

  const liveStreams = streams
  const categoryId = game.english_title?.trim()
  const gameCover = getBestGameImage(game.header_image_url, game.cover_image_url)
  const gameTitle = getDisplayGameTitle(game)

  /** 한 번에 가져올 다시보기 개수(API 최대 50). 늘릴수록 인기순 정렬 풀은 넓어지나 응답이 커짐 */
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
      "GameDetails VOD"
    )
      .then((data) => {
        const items = (data.videos as unknown[] | undefined) ?? []
        const mapped = mapApiVideosToVideoData(items, gameCover, gameTitle, game.id)
        setVideos(sortChzzkVodList(mapped, vodSortKey))
        const next = parseVodNextCursor(data)
        setVideoNextCursor(next)
        setHasMoreVideos(next != null && items.length > 0)
      })
      .finally(() => setVideosLoading(false))
  }, [activeTab, categoryId, gameCover, gameTitle, game.id, chzzkVodSort])

  useEffect(() => {
    if (activeTab !== "clip" || !categoryId) return
    setClips([])
    setDisplayClipCount(16)
    setClipsLoading(true)
    fetchChzzkProxyJson(
      `/api/chzzk/clips?categoryId=${encodeURIComponent(categoryId)}&filterType=${clipFilterType}&orderType=${clipOrderType}&size=50`,
      "GameDetails Clips"
    )
      .then((data) => {
        const items = (data.clips as unknown[] | undefined) ?? []
        setClips(
          items.map((c: any) => ({
            clipUID: c.clipUID ?? "",
            clipTitle: c.clipTitle ?? "제목 없음",
            thumbnailImageUrl: c.thumbnailImageUrl ?? "",
            readCount: Number(c.readCount ?? 0),
            duration: Number(c.duration ?? 0),
            channelName: c.ownerChannel?.channelName ?? "알 수 없음",
            channelId: c.ownerChannel?.channelId ?? c.ownerChannelId ?? "",
            gameCover,
            gameTitle,
            gameId: game.id,
            createdDate: c.createdDate ?? "",
          }))
        )
      })
      .finally(() => setClipsLoading(false))
  }, [activeTab, categoryId, chzzkClipListFilter, gameCover, gameTitle, game.id])

  const handleLoadMoreVideos = () => {
    if (!categoryId || loadMoreLoading || !hasMoreVideos || !videoNextCursor) return
    setLoadMoreLoading(true)
    const { publishDateAt, readCount } = videoNextCursor
    fetchChzzkProxyJson(
      `/api/chzzk/videos?categoryId=${encodeURIComponent(categoryId)}&size=${VOD_FETCH_SIZE}&filterType=${vodFilterType}&orderType=${vodOrderType}&publishDateAt=${publishDateAt}&readCount=${readCount}`,
      "GameDetails VOD load more"
    )
      .then((data) => {
        const items = (data.videos as unknown[] | undefined) ?? []
        const newVideos = mapApiVideosToVideoData(items, gameCover, gameTitle, game.id)
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
    setDisplayClipCount((prev) => prev + 16) // 4 rows × 4 cols
  }

  const displayedClips = clips.slice(0, displayClipCount)
  const hasMoreClips = clips.length > displayClipCount

  const displayedStreams = liveStreams.slice(0, displayStreamCount)
  const hasMoreStreams = liveStreams.length > displayStreamCount

  const handleLoadMoreStreams = () => {
    setDisplayStreamCount((prev) => prev + 16) // 4 rows × 4 cols
  }

  // 헤더 통계: Top Live 집계값 우선, 없으면 현재 스트리밍 목록 합산 (fallback)
  const headerViewers =
    totalViewersProp ?? liveStreams.reduce((sum, stream) => sum + (stream.viewers || 0), 0)
  const headerStreamCount = liveStreamCountProp ?? liveStreams.length
  const viewersFormatted = headerViewers >= 1000
    ? `${(headerViewers / 1000).toFixed(1)}K`
    : String(headerViewers)
  
  // Use top_tags from game object (top 5 tags)
  const tags = game.top_tags && Array.isArray(game.top_tags) 
    ? game.top_tags.slice(0, 5) 
    : []
  
  const handleFollowClick = () => {
    startTransition(async () => {
      await toggleFavorite(game.id)
    })
  }

  const handleVisitStoreClick = () => {
    setSteamModalOpen(true)
  }

  const handleContinueToSteam = () => {
    if (game.steam_appid != null) {
      window.open(`https://store.steampowered.com/app/${game.steam_appid}`, "_blank")
    }
    setSteamModalOpen(false)
  }

  return (
    <div className="flex flex-col">
      {/* Back Button */}
      <div className="px-4 pt-4 lg:px-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로
        </Button>
      </div>

      {/* Hero Section */}
      <div className="relative mx-4 mt-3 overflow-hidden rounded-2xl border border-border lg:mx-6">
        {/* Blurred Background */}
        <div className="absolute inset-0">
          <GameImage
            src={game.background_image_url}
            type="background"
            alt=""
            fill
            placeholder="empty"
            className="object-cover"
            sizes="100vw"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card/90 via-card/70 to-card/40" />
        </div>

        {/* Hero Content */}
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:gap-8 sm:p-8">
          {/* Cover Art */}
          <div className="relative h-52 w-36 shrink-0 overflow-hidden rounded-xl border-2 border-border/50 shadow-2xl sm:h-64 sm:w-44">
            <GameImage
              src={game.header_image_url ?? game.cover_image_url}
              type="cover"
              alt={getDisplayGameTitle(game)}
              fill
              placeholder="empty"
              className="object-cover"
              sizes="(min-width: 640px) 176px, 144px"
            />
          </div>

          {/* Game Info */}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {getDisplayGameTitle(game)}
            </h1>

            {/* Stats Row */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-foreground">
                <Radio className="h-4 w-4 text-[hsl(var(--live-red))]" />
                <span className="font-semibold">{headerStreamCount}</span>
                <span className="text-muted-foreground">라이브 채널</span>
              </span>
              <span className="flex items-center gap-1.5 text-foreground">
                <Users className="h-4 w-4 text-[hsl(var(--neon-purple))]" />
                <span className="font-semibold">{viewersFormatted}</span>
                <span className="text-muted-foreground">시청자</span>
              </span>
              {game.discount_rate != null && game.discount_rate > 0 && (
                <span className="flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-amber-400" />
                  <Badge className="border-transparent bg-gradient-to-r from-amber-500 to-red-500 px-2 py-0.5 text-xs font-bold text-[hsl(var(--primary-foreground))]">
                    -{game.discount_rate}% 스팀 할인
                  </Badge>
                </span>
              )}
            </div>

            {/* Tags Row */}
            {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {tags.map((tag, index) => (
                  <Link
                    key={index}
                    href={`/tags/${encodeURIComponent(tag)}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Badge className="inline-flex items-center rounded-md border border-[hsl(var(--neon-purple))]/40 bg-[hsl(var(--neon-purple))]/10 px-2.5 py-1 text-xs font-medium text-[hsl(var(--neon-purple))] shadow-sm transition-all duration-200 hover:scale-[1.03] hover:border-[hsl(var(--neon-purple))]/70 hover:bg-[hsl(var(--neon-purple))]/20 hover:shadow-md cursor-pointer">
                      #{tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleFollowClick}
                disabled={isPending}
                className={
                  isFollowing
                    ? "bg-[hsl(var(--neon-purple))]/15 text-[hsl(var(--neon-purple))] hover:bg-[hsl(var(--neon-purple))]/25 disabled:opacity-70"
                    : "bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--neon-purple))]/80 disabled:opacity-70"
                }
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Heart className={`mr-2 h-4 w-4 ${isFollowing ? "fill-current" : ""}`} />
                )}
                {isFollowing ? "팔로우 중" : "게임 팔로우"}
              </Button>
              {game.steam_appid != null && (
                <Button
                  variant="outline"
                  className="border-border text-foreground hover:bg-secondary"
                  onClick={handleVisitStoreClick}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  스토어 열기
                </Button>
              )}
            </div>
          </div>

          {/* Game Ratings - 우측 영역 (크리틱 스코어 너비 기준 중앙 정렬) */}
          {(isValidSteamReview(game) && game.steam_positive_ratio != null) || game.critic_score != null ? (
            <div className="flex shrink-0 flex-col items-center gap-6 sm:items-end">
              {isValidSteamReview(game) && game.steam_positive_ratio != null && (
                <div className="flex w-[7.5rem] flex-col items-center gap-2">
                  <span className="w-full rounded-md bg-muted/80 px-2.5 py-1 text-center text-xs font-medium text-muted-foreground">
                    스팀 점수
                  </span>
                  <DonutChart
                    value={game.steam_positive_ratio}
                    centerLabel={`${game.steam_positive_ratio}%`}
                    size={72}
                    strokeWidth={8}
                  />
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-center text-sm font-medium text-foreground">
                      {game.steam_review_desc}
                    </span>
                    {game.steam_total_reviews != null && (
                      <span className="text-center text-xs text-muted-foreground">
                        {game.steam_total_reviews.toLocaleString()}개 평가
                      </span>
                    )}
                  </div>
                </div>
              )}
              {game.critic_score != null && (
                <div className="flex w-[7.5rem] flex-col items-center gap-2">
                  <span className="w-full rounded-md bg-muted/80 px-2.5 py-1 text-center text-xs font-medium text-muted-foreground">
                    크리틱 스코어
                  </span>
                  <DonutChart
                    value={game.critic_score}
                    centerLabel={`${game.critic_score}`}
                    size={72}
                    strokeWidth={8}
                  />
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Steam Store Modal */}
      <AlertDialog open={steamModalOpen} onOpenChange={setSteamModalOpen}>
        <AlertDialogContent className="border-border bg-card text-foreground">
          <AlertDialogHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--neon-purple))]/15">
              <ExternalLink className="h-6 w-6 text-[hsl(var(--neon-purple))]" />
            </div>
            <AlertDialogTitle className="text-foreground">Steam 스토어로 이동할까요?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Steam 스토어 페이지로 이동합니다. 계속하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-secondary text-foreground hover:bg-secondary/80 hover:text-foreground">
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--neon-purple))]/80"
              onClick={handleContinueToSteam}
            >
              이동
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Live / Video Tabs */}
      <div className="flex flex-col gap-6 p-4 lg:p-6">
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
    </div>
  )
}

