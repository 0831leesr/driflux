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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StreamCard, type StreamData } from "@/components/stream-card"
import { VideoCard, type VideoData } from "@/components/video-card"
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

/* ── Main Game Details Component ── */
type TabType = "live" | "video"

export function GameDetailsClient({
  game,
  streams,
  onBack,
  onStreamClick,
  onVideoClick,
}: {
  game: GameRow
  streams: StreamData[]
  onBack: () => void
  onStreamClick?: (stream: StreamData) => void
  onVideoClick?: (video: VideoData) => void
}) {
  const { isFavorite, toggleFavorite } = useFavoriteGames()
  const isFollowing = isFavorite(game.id)
  const [steamModalOpen, setSteamModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>("live")
  const [videos, setVideos] = useState<VideoData[]>([])
  const [videosLoading, setVideosLoading] = useState(false)
  const [videosFetched, setVideosFetched] = useState(false)

  const liveStreams = streams
  const categoryId = game.english_title?.trim()
  const gameCover = getBestGameImage(game.header_image_url, game.cover_image_url)
  const gameTitle = getDisplayGameTitle(game)

  useEffect(() => {
    if (activeTab !== "video" || !categoryId || videosFetched) return
    setVideosLoading(true)
    fetch(`/api/chzzk/videos?categoryId=${encodeURIComponent(categoryId)}&size=20`)
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
        setVideosFetched(true)
      })
      .catch(() => setVideos([]))
      .finally(() => setVideosLoading(false))
  }, [activeTab, categoryId, videosFetched, gameCover, gameTitle, game.id])
  
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
            Live
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
            Video
          </Button>
        </div>

        {activeTab === "live" && (
          <div className="card-grid-4-wrapper -mx-4 px-4 lg:-mx-6 lg:px-6">
            <div className="card-grid-4">
              {liveStreams.map((stream, i) => (
                <StreamCard
                  key={`${stream.streamerName}-${i}`}
                  stream={stream}
                  onStreamClick={onStreamClick}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === "video" && (
          <div className="card-grid-4-wrapper -mx-4 px-4 lg:-mx-6 lg:px-6">
            {!categoryId ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                이 게임의 다시보기 영상 정보를 불러올 수 없습니다.
              </p>
            ) : videosLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                영상 목록을 불러오는 중...
              </p>
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
        )}
      </div>
    </div>
  )
}

