"use client"

import { TrendingUp } from "lucide-react"
import { GameCard, type GameCardData } from "@/components/game-card"
import { GameCardSkeleton } from "@/components/skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import type { TrendingGameRow } from "@/lib/data"
import { buildFeatureTags } from "@/lib/feature-tags"
import { newReleaseDPlusForBadge } from "@/lib/release-date"

function toCardData(games: TrendingGameRow[], yesterdayTrendingIds: Set<number>): GameCardData[] {
  return games.map((game) => ({
    id: game.id,
    slug: game.slug ?? null,
    title: game.title,
    cover_image_url: game.cover_image_url,
    header_image_url: game.header_image_url ?? game.cover_image_url ?? undefined,
    price_krw: game.price_krw ?? null,
    original_price_krw: game.original_price_krw ?? null,
    discount_rate: game.discount_rate ?? null,
    is_free: game.is_free ?? null,
    totalViewers: game.totalViewers,
    liveStreamCount: game.liveStreamCount,
    topTag: game.topTag,
    topTags: (game as { top_tags?: string[] | null }).top_tags?.slice(0, 2),
    featureTags: buildFeatureTags({
      newReleaseDPlus: newReleaseDPlusForBadge(game.release_date ?? null),
      isTrending: yesterdayTrendingIds.has(game.id),
      isRising: true,
    }),
  }))
}

interface RisingGamesProps {
  /** 서버에서 momentum_score > 0 기준 정렬·상위 8개로 필터링된 목록 */
  games: TrendingGameRow[]
  yesterdayTrendingIds: Set<number>
  /** true면 스켈레톤만 표시 (Suspense fallback 등) */
  isLoading?: boolean
}

/** 급상승 섹션 전용 스켈레톤 — 카드 8개 분량 높이로 레이아웃 점프 완화 */
export function RisingGamesSkeleton() {
  return (
    <section
      className="border-t border-border/50 pt-8 sm:pt-10"
      aria-busy="true"
      aria-label="인기 급상승 게임 로딩 중"
    >
      <Skeleton className="mb-4 h-7 w-[min(100%,14rem)] max-w-full rounded-md" />
      <div className="card-grid-home-wrapper -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="card-grid-home">
          {Array.from({ length: 8 }).map((_, i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

export function RisingGames({ games, yesterdayTrendingIds, isLoading }: RisingGamesProps) {
  if (isLoading) {
    return <RisingGamesSkeleton />
  }

  const cardData = toCardData(games, yesterdayTrendingIds)
  const isEmpty = cardData.length === 0

  return (
    <section className="border-t border-border/50 pt-8 sm:pt-10">
      <h2 className="mb-4 text-lg font-bold text-foreground">🚀 인기 급상승 게임</h2>

      {isEmpty ? (
        <div
          className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center sm:min-h-[220px]"
          role="status"
        >
          <TrendingUp className="h-12 w-12 shrink-0 text-muted-foreground/50" aria-hidden />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            현재 급상승 중인 방송이 없습니다. 30분 단위로 차트가 갱신됩니다.
          </p>
        </div>
      ) : (
        <div className="card-grid-home-wrapper -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="card-grid-home">
            {cardData.map((game, index) => (
              <GameCard key={`rising-${game.id}`} game={game} priority={index < 4} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
