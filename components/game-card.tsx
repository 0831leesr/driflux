"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Heart, Eye, Gift, Sparkles } from "lucide-react"
import {
  formatKRW,
  formatDiscountRate,
  formatViewerCountShort,
  getDisplayGameTitle,
} from "@/lib/utils"
import GameImage from "@/components/ui/game-image"
import { useFavoriteGames } from "@/contexts/favorites-context"
import { Button } from "@/components/ui/button"

export interface GameCardData {
  id: number
  title: string
  korean_title?: string | null
  cover_image_url: string | null
  header_image_url?: string | null
  price_krw: number | null
  original_price_krw: number | null
  discount_rate: number | null
  is_free?: boolean | null
  // Optional streaming stats (for trending games)
  totalViewers?: number
  liveStreamCount?: number
  topTag?: string
  /** 상위 태그 최대 2개 (topTag보다 우선) */
  topTags?: string[]
  /** 드롭스 진행 중 뱃지 표시 (드롭스 섹션용) */
  showDropsBadge?: boolean
  /** 출시 N일차 (신작 섹션용, 0이면 NEW, 1이상이면 D-N) */
  daysSinceRelease?: number
}

export function GameCard({ game, priority }: { game: GameCardData; priority?: boolean }) {
  const hasDiscount = game.discount_rate && game.discount_rate > 0
  const isFree = game.is_free || game.price_krw === 0

  const { isFavorite, toggleFavorite } = useFavoriteGames()
  const isGameFavorite = isFavorite(game.id)

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(game.id)
  }

  const hasStreamStats =
    (game.totalViewers !== undefined && game.totalViewers > 0) ||
    (game.liveStreamCount !== undefined && game.liveStreamCount > 0)

  const displayTags =
    game.topTags?.slice(0, 2) ?? (game.topTag ? [game.topTag] : [])

  return (
    <Link
      href={`/game/${game.id}`}
      className="group block overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 transition-all duration-300 hover:border-[hsl(var(--neon-purple))]/50 hover:shadow-[0_0_20px_hsl(var(--neon-purple)_/_0.2)]"
    >
      {/* Image Area - 3:4 aspect ratio */}
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        <GameImage
          src={game.cover_image_url ?? game.header_image_url}
          type="cover"
          alt={getDisplayGameTitle(game)}
          fill
          priority={priority}
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          sizes="(min-width: 872px) 25vw, 200px"
        />

        {/* Bottom gradient for text readability */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
          aria-hidden
        />

        {/* Top-left: Conditional badge (드롭스 or 신작) */}
        {game.showDropsBadge && (
          <div className="absolute left-2 top-2">
            <Badge className="border-0 bg-violet-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-md">
              <Gift className="mr-1 inline h-2.5 w-2.5" />
              드롭스
            </Badge>
          </div>
        )}
        {game.daysSinceRelease !== undefined && !game.showDropsBadge && (
          <div className="absolute left-2 top-2">
            <Badge className="border-0 bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-md">
              <Sparkles className="mr-1 inline h-2.5 w-2.5" />
              {game.daysSinceRelease === 0 ? "신작" : `D-${game.daysSinceRelease}`}
            </Badge>
          </div>
        )}

        {/* Top-right: Follow (Heart) button - glassmorphism */}
        <div className="absolute right-2 top-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleFavoriteClick}
            className={`h-8 w-8 rounded-full bg-white/10 backdrop-blur-md transition-all hover:bg-white/20 ${
              isGameFavorite
                ? "text-red-400 hover:text-red-300"
                : "text-white hover:text-white/90"
            }`}
            aria-label={isGameFavorite ? "팔로우 해제" : "팔로우"}
          >
            <Heart
              className={`h-4 w-4 ${isGameFavorite ? "fill-current" : ""}`}
            />
          </Button>
        </div>

        {/* Bottom-left (on gradient): Stream count | Viewer count */}
        {hasStreamStats && (
          <div className="absolute bottom-2 left-2 flex items-center gap-2 text-xs font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {game.liveStreamCount !== undefined && game.liveStreamCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                {game.liveStreamCount}
              </span>
            )}
            {game.liveStreamCount !== undefined &&
              game.liveStreamCount > 0 &&
              game.totalViewers !== undefined &&
              game.totalViewers > 0 && (
                <span className="text-white/60">|</span>
              )}
            {game.totalViewers !== undefined && game.totalViewers > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {formatViewerCountShort(game.totalViewers)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Info Area */}
      <div className="p-3">
        {/* Game name - bold, truncate */}
        <h3 className="truncate text-base font-bold text-white">
          {getDisplayGameTitle(game)}
        </h3>

        {/* Second line: tags (left, max 2) | price overlay (right, on top with gradient) */}
        <div className="relative mt-2 h-6 overflow-hidden">
          {/* Tags - behind, no wrap, get clipped when overlapping price */}
          <div className="flex min-w-0 items-center gap-1 overflow-hidden">
            {displayTags.map((tag) => (
              <Badge
                key={tag}
                className="max-w-[72px] shrink-0 truncate rounded-md border-0 bg-neutral-700 px-2 py-0.5 text-[10px] font-medium text-neutral-200"
              >
                {tag}
              </Badge>
            ))}
          </div>

          {/* Price overlay - on top, gradient fades tags naturally */}
          <div className="absolute inset-y-0 right-0 z-10 flex min-w-0 items-center justify-end bg-gradient-to-r from-transparent via-neutral-900/90 to-neutral-900 pl-16">
            <div className="shrink-0 text-right">
              {isFree ? (
                <span className="text-xs font-bold text-emerald-400">무료</span>
              ) : hasDiscount ? (
                <span className="flex items-center justify-end gap-1">
                  <span className="text-[10px] font-medium text-red-400">
                    {formatDiscountRate(game.discount_rate)}
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    {formatKRW(game.price_krw)}
                  </span>
                </span>
              ) : game.price_krw !== null ? (
                <span className="text-xs font-semibold text-neutral-300">
                  {formatKRW(game.price_krw)}
                </span>
              ) : (
                <span className="text-[10px] text-neutral-500">
                  가격 정보 없음
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
