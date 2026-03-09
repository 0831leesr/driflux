"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StreamCard, type StreamData } from "@/components/stream-card"
import { VideoCard, type VideoData } from "@/components/video-card"
import { ClipCard, type ClipData } from "@/components/clip-card"
import type { GameRow } from "@/lib/data"
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
/** 스팀 평가 표시 가능 여부: Overwhelmingly Positive ~ Overwhelmingly Negative만. NULL, "No user reviews", "N user reviews" 제외 */
function isValidSteamReview(game: { steam_review_desc?: string | null }): boolean {
  const desc = game.steam_review_desc?.trim()
  if (!desc) return false
  if (/^no user reviews$/i.test(desc)) return false
  if (/^\d+ user reviews?$/i.test(desc)) return false
  return true
}

/* ── Clip filter/order types ── */
const CLIP_FILTER_OPTIONS = [
  { value: "WITHIN_THIRTY_DAYS", label: "30일" },
  { value: "WITHIN_SEVEN_DAYS", label: "7일" },
  { value: "WITHIN_ONE_DAY", label: "24시간" },
  { value: "ALL", label: "전체" },
] as const
const CLIP_ORDER_OPTIONS = [
  { value: "POPULAR", label: "인기순" },
  { value: "RECENT", label: "최신순" },
] as const

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
  onBack,
  onStreamClick,
  onVideoClick,
  onClipClick,
}: {
  game: GameRow
  streams: StreamData[]
  onBack: () => void
  onStreamClick?: (stream: StreamData) => void
  onVideoClick?: (video: VideoData) => void
  onClipClick?: (clip: ClipData) => void
}) {
  const { isFavorite, toggleFavorite } = useFavoriteGames()
  const isFollowing = isFavorite(game.id)
  const [steamModalOpen, setSteamModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>("live")
  const [videos, setVideos] = useState<VideoData[]>([])
  const [videosLoading, setVideosLoading] = useState(false)
  const [loadMoreLoading, setLoadMoreLoading] = useState(false)
  const [hasMoreVideos, setHasMoreVideos] = useState(true)

  const [clips, setClips] = useState<ClipData[]>([])
  const [clipsLoading, setClipsLoading] = useState(false)
  const [clipFilterType, setClipFilterType] = useState<"WITHIN_THIRTY_DAYS" | "WITHIN_SEVEN_DAYS" | "WITHIN_ONE_DAY" | "ALL">("WITHIN_THIRTY_DAYS")
  const [clipOrderType, setClipOrderType] = useState<"POPULAR" | "RECENT">("POPULAR")
  const [displayClipCount, setDisplayClipCount] = useState(16) // 4 rows × 4 cols
  const [displayStreamCount, setDisplayStreamCount] = useState(16) // 4 rows × 4 cols (시청자 기준 16개 우선 로딩)

  const liveStreams = streams
  const categoryId = game.english_title?.trim()
  const gameCover = getBestGameImage(game.header_image_url, game.cover_image_url)
  const gameTitle = getDisplayGameTitle(game)

  const BATCH_SIZE = 16

  useEffect(() => {
    if (activeTab !== "video" || !categoryId) return
    setVideos([])
    setHasMoreVideos(true)
    setVideosLoading(true)
    fetch(`/api/chzzk/videos?categoryId=${encodeURIComponent(categoryId)}&size=${BATCH_SIZE}&offset=0`)
      .then((res) => res.json())
      .then((data) => {
        const items = data.videos ?? []
        setVideos(
          items.map((v: any) => ({
            videoId: v.videoId ?? "",
            videoTitle: v.videoTitle ?? "No Title",
            thumbnailImageUrl: v.thumbnailImageUrl ?? "",
            readCount: Number(v.readCount ?? 0),
            channelName: v.channel?.channelName ?? "Unknown",
            channelId: v.channel?.channelId ?? "",
            gameCover,
            gameTitle,
            gameId: game.id,
          }))
        )
        setHasMoreVideos(items.length >= BATCH_SIZE)
      })
      .catch(() => {
        setVideos([])
        setHasMoreVideos(false)
      })
      .finally(() => setVideosLoading(false))
  }, [activeTab, categoryId, gameCover, gameTitle, game.id])

  useEffect(() => {
    if (activeTab !== "clip" || !categoryId) return
    setClips([])
    setDisplayClipCount(16)
    setClipsLoading(true)
    fetch(
      `/api/chzzk/clips?categoryId=${encodeURIComponent(categoryId)}&filterType=${clipFilterType}&orderType=${clipOrderType}&size=50`
    )
      .then((res) => res.json())
      .then((data) => {
        const items = data.clips ?? []
        setClips(
          items.map((c: any) => ({
            clipUID: c.clipUID ?? "",
            clipTitle: c.clipTitle ?? "No Title",
            thumbnailImageUrl: c.thumbnailImageUrl ?? "",
            readCount: Number(c.readCount ?? 0),
            duration: Number(c.duration ?? 0),
            channelName: c.ownerChannel?.channelName ?? "Unknown",
            channelId: c.ownerChannel?.channelId ?? c.ownerChannelId ?? "",
            gameCover,
            gameTitle,
            gameId: game.id,
          }))
        )
      })
      .catch(() => setClips([]))
      .finally(() => setClipsLoading(false))
  }, [activeTab, categoryId, clipFilterType, clipOrderType, gameCover, gameTitle, game.id])

  const handleLoadMoreVideos = () => {
    if (!categoryId || loadMoreLoading || !hasMoreVideos) return
    setLoadMoreLoading(true)
    const offset = videos.length
    fetch(`/api/chzzk/videos?categoryId=${encodeURIComponent(categoryId)}&size=${BATCH_SIZE}&offset=${offset}`)
      .then((res) => res.json())
      .then((data) => {
        const items = data.videos ?? []
        if (items.length > 0) {
          const newVideos: VideoData[] = items.map((v: any) => ({
            videoId: v.videoId ?? "",
            videoTitle: v.videoTitle ?? "No Title",
            thumbnailImageUrl: v.thumbnailImageUrl ?? "",
            readCount: Number(v.readCount ?? 0),
            channelName: v.channel?.channelName ?? "Unknown",
            channelId: v.channel?.channelId ?? "",
            gameCover,
            gameTitle,
            gameId: game.id,
          }))
          setVideos((prev) => [...prev, ...newVideos])
        }
        setHasMoreVideos(items.length >= BATCH_SIZE)
      })
      .catch(() => setHasMoreVideos(false))
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

  // Calculate total viewers
  const totalViewers = liveStreams.reduce((sum, stream) => sum + (stream.viewers || 0), 0)
  const viewersFormatted = totalViewers >= 1000 
    ? `${(totalViewers / 1000).toFixed(1)}K` 
    : String(totalViewers)
  
  // Use top_tags from game object (top 5 tags)
  const tags = game.top_tags && Array.isArray(game.top_tags) 
    ? game.top_tags.slice(0, 5) 
    : []
  
  const handleFollowClick = () => {
    toggleFavorite(game.id)
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
          Back
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
                <span className="font-semibold">{liveStreams.length}</span>
                <span className="text-muted-foreground">Live Channels</span>
              </span>
              <span className="flex items-center gap-1.5 text-foreground">
                <Users className="h-4 w-4 text-[hsl(var(--neon-purple))]" />
                <span className="font-semibold">{viewersFormatted}</span>
                <span className="text-muted-foreground">Viewers</span>
              </span>
              {game.discount_rate && game.discount_rate > 0 && (
                <span className="flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-amber-400" />
                  <Badge className="border-transparent bg-gradient-to-r from-amber-500 to-red-500 px-2 py-0.5 text-xs font-bold text-[hsl(var(--primary-foreground))]">
                    -{game.discount_rate}% Steam Sale
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
                className={
                  isFollowing
                    ? "bg-[hsl(var(--neon-purple))]/15 text-[hsl(var(--neon-purple))] hover:bg-[hsl(var(--neon-purple))]/25"
                    : "bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--neon-purple))]/80"
                }
              >
                <Heart
                  className={`mr-2 h-4 w-4 ${isFollowing ? "fill-current" : ""}`}
                />
                {isFollowing ? "Following" : "Follow Game"}
              </Button>
              {game.steam_appid != null && (
                <Button
                  variant="outline"
                  className="border-border text-foreground hover:bg-secondary"
                  onClick={handleVisitStoreClick}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Visit Store
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
            <AlertDialogTitle className="text-foreground">
              Visit Steam Store?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              You are being redirected to the Steam store. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-secondary text-foreground hover:bg-secondary/80 hover:text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--neon-purple))]/80"
              onClick={handleContinueToSteam}
            >
              Continue
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
            {hasMoreVideos && videos.length > 0 && (
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
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">기간:</span>
                <div className="flex gap-1 rounded-lg border border-border p-0.5">
                  {CLIP_FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setClipFilterType(opt.value)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        clipFilterType === opt.value
                          ? "bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))]"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">정렬:</span>
                <div className="flex gap-1 rounded-lg border border-border p-0.5">
                  {CLIP_ORDER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setClipOrderType(opt.value)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        clipOrderType === opt.value
                          ? "bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))]"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

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

