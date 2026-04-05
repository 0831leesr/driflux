"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { ArrowLeft, TrendingUp, Heart, Users, Flame, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GameCard, type GameCardData } from "@/components/game-card"
import { useFavoriteTags } from "@/contexts/favorites-context"
import type { HistoricalTrendingRow, TrendingGameRow } from "@/lib/data"

const PAGE_SIZE = 16

interface TagDetailsPageProps {
  tagName: string
  trendGames: HistoricalTrendingRow[]
  hotLiveGames: TrendingGameRow[]
}

function trendToCardData(game: HistoricalTrendingRow): GameCardData {
  return {
    id: game.id,
    title: game.title,
    cover_image_url: game.cover_image_url,
    header_image_url: game.header_image_url ?? undefined,
    price_krw: game.price_krw ?? null,
    original_price_krw: game.original_price_krw ?? null,
    discount_rate: game.discount_rate ?? null,
    is_free: game.is_free ?? null,
    topTag: game.top_tags?.[0],
    topTags: game.top_tags?.slice(0, 2) ?? undefined,
    totalViewers: game.peak_viewers > 0 ? game.peak_viewers : undefined,
    liveStreamCount: 0,
  }
}

function liveToCardData(game: TrendingGameRow): GameCardData {
  return {
    id: game.id,
    title: game.title,
    cover_image_url: game.cover_image_url,
    header_image_url: game.header_image_url ?? undefined,
    price_krw: game.price_krw ?? null,
    original_price_krw: game.original_price_krw ?? null,
    discount_rate: game.discount_rate ?? null,
    is_free: game.is_free ?? null,
    topTag: game.topTag,
    topTags: Array.isArray((game as any).top_tags) ? (game as any).top_tags.slice(0, 2) : undefined,
    totalViewers: game.totalViewers,
    liveStreamCount: game.liveStreamCount,
  }
}

export function TagDetailsPage({ tagName, trendGames, hotLiveGames }: TagDetailsPageProps) {
  const [shownCount, setShownCount] = useState(PAGE_SIZE)
  const { isFavorite, toggleFavorite } = useFavoriteTags()
  const isFollowing = isFavorite(tagName)
  const [isPending, startTransition] = useTransition()

  const totalHotViewers = hotLiveGames.reduce((sum, g) => sum + (g.totalViewers ?? 0), 0)
  const hotViewersFormatted =
    totalHotViewers >= 1000
      ? `${(totalHotViewers / 1000).toFixed(1)}K`
      : String(totalHotViewers)

  const visibleTrend = trendGames.slice(0, shownCount).map(trendToCardData)
  const hasMoreTrend = shownCount < trendGames.length

  return (
    <div className="flex flex-col">
      {/* Back Button */}
      <div className="px-4 pt-4 lg:px-6">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            홈으로
          </Link>
        </Button>
      </div>

      {/* Hero Section */}
      <div className="relative mx-4 mt-3 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[hsl(var(--neon-purple))]/10 via-card to-card lg:mx-6">
        <div className="relative flex flex-col gap-4 p-6 sm:p-8">
          <div className="flex flex-col gap-4">
            <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              #{tagName}
            </h1>

            {/* Stats Row */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-foreground">
                <TrendingUp className="h-4 w-4 text-[hsl(var(--neon-purple))]" />
                <span className="font-semibold">{trendGames.length}</span>
                <span className="text-muted-foreground">트렌드 게임</span>
              </span>
              {hotLiveGames.length > 0 && (
                <span className="flex items-center gap-1.5 text-foreground">
                  <Users className="h-4 w-4 text-[hsl(var(--live-red))]" />
                  <span className="font-semibold">{hotViewersFormatted}</span>
                  <span className="text-muted-foreground">라이브 시청자</span>
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await toggleFavorite(tagName)
                  })
                }
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
                {isFollowing ? "팔로우 중" : "태그 팔로우"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8 p-4 lg:p-6">
        {/* ── HOT LIVE SECTION (조건부 렌더링) ── */}
        {hotLiveGames.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Flame className="h-5 w-5 text-[hsl(var(--live-red))]" />
              <h2 className="text-lg font-semibold text-foreground">
                🔥 현재 핫한{" "}
                <span className="text-[hsl(var(--live-red))]">#{tagName}</span> 라이브
              </h2>
              <span className="flex items-center gap-1 rounded-full bg-[hsl(var(--live-red))]/10 px-2 py-0.5 text-xs font-medium text-[hsl(var(--live-red))]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[hsl(var(--live-red))]" />
                라이브 {hotLiveGames.length}
              </span>
            </div>
            <div className="card-grid-4-wrapper -mx-4 px-4 lg:-mx-6 lg:px-6">
              <div className="card-grid-4">
                {hotLiveGames.map((game, i) => (
                  <GameCard key={game.id} game={liveToCardData(game)} priority={i < 4} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── TREND GAMES SECTION ── */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[hsl(var(--neon-purple))]" />
            <h2 className="text-lg font-semibold text-foreground">
              #{tagName} 트렌드 게임
            </h2>
            <span className="text-sm text-muted-foreground">
              주간 트렌드 점수 순
            </span>
          </div>

          {trendGames.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
              <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <h3 className="text-lg font-semibold text-foreground">
                #{tagName} 게임이 없습니다
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                아직 이 태그를 가진 게임이 없거나 트렌드 데이터가 쌓이지 않았습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="card-grid-4-wrapper -mx-4 px-4 lg:-mx-6 lg:px-6">
                <div className="card-grid-4">
                  {visibleTrend.map((game, i) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      priority={hotLiveGames.length === 0 && i < 4}
                    />
                  ))}
                </div>
              </div>
              {hasMoreTrend && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShownCount((n) => n + PAGE_SIZE)}
                    className="min-w-[160px] border-border"
                  >
                    더 보기 ({trendGames.length - shownCount}개 남음)
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
