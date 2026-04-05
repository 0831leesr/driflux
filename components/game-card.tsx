"use client"

import { useTransition } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Heart, Eye, Gift, Sparkles, Loader2 } from "lucide-react"
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
  /** Optional streaming stats (for trending games) */
  totalViewers?: number
  liveStreamCount?: number
  topTag?: string
  /** 상위 태그 최대 2개 (topTag보다 우선) */
  topTags?: string[]
  /** 드롭스 진행 중 뱃지 표시 (드롭스 섹션용) */
  showDropsBadge?: boolean
  /** 출시 N일차 (신작 섹션용, 0이면 NEW, 1이상이면 D-N) */
  daysSinceRelease?: number
  /** 급상승 탭 — 시청자 수 옆 붉은 강조 (momentum_score) */
  momentumScore?: number
  /** 설정 시 이 경로로 이동 (치지직 카테고리 등). 내부 `/game/:id` 대신 사용 */
  cardHref?: string
  /** true면 팔로우(하트) 숨김 — 외부 전용 카드용 */
  hideFavorite?: boolean
}

export function GameCard({ game, priority }: { game: GameCardData; priority?: boolean }) {
  const hasDiscount = game.discount_rate && game.discount_rate > 0
  const isFree = game.is_free || game.price_krw === 0
  const href = game.cardHref ?? `/game/${game.id}`
  const isExternal = Boolean(game.cardHref)

  const { isFavorite, toggleFavorite } = useFavoriteGames()
  const isGameFavorite = isFavorite(game.id)
  const [isPending, startTransition] = useTransition()

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    startTransition(async () => {
      await toggleFavorite(game.id)
    })
  }

  const hasStreamStats =
    (game.totalViewers !== undefined && game.totalViewers > 0) ||
    (game.liveStreamCount !== undefined && game.liveStreamCount > 0)

  const displayTags =
    game.topTags?.slice(0, 2) ?? (game.topTag ? [game.topTag] : [])

  return (
    <Link
      href={href}
      {...(isExternal
        ? { target: "_blank" as const, rel: "noopener noreferrer" }
        : {})}
      className="group block overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 transition-all duration-300 hover:border-[hsl(var(--neon-purple))]/50 hover:shadow-[0_0_20px_hsl(var(--neon-purple)_/_0.2)]"
    >
      {/* 3:4 poster — all info overlaid on gradient */}
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

        {/* Deep gradient — covers bottom 60% for overlaid text */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/95 via-black/60 to-transparent"
          aria-hidden
        />

        {/* Top-left: contextual badge */}
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

        {/* Top-right: Follow (Heart) — DB 게임 상세에만 표시 */}
        {!game.hideFavorite && (
          <div className="absolute right-2 top-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleFavoriteClick}
              disabled={isPending}
              className={`h-8 w-8 rounded-full bg-white/10 backdrop-blur-md transition-all hover:bg-white/20 disabled:opacity-70 ${
                isGameFavorite
                  ? "text-red-400 hover:text-red-300"
                  : "text-white hover:text-white/90"
              }`}
              aria-label={isGameFavorite ? "팔로우 해제" : "팔로우"}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart className={`h-4 w-4 ${isGameFavorite ? "fill-current" : ""}`} />
              )}
            </Button>
          </div>
        )}

        {/* Bottom overlay: stream stats + tags + title + price */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          {/* Live stream stats */}
          {hasStreamStats && (
            <div className="mb-1.5 flex items-center gap-2 text-[11px] font-medium text-white/90 drop-shadow">
              {game.liveStreamCount !== undefined && game.liveStreamCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                  {game.liveStreamCount}
                </span>
              )}
              {game.liveStreamCount !== undefined &&
                game.liveStreamCount > 0 &&
                game.totalViewers !== undefined &&
                game.totalViewers > 0 && (
                  <span className="text-white/50">·</span>
                )}
              {game.totalViewers !== undefined && game.totalViewers > 0 && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {formatViewerCountShort(game.totalViewers)}
                </span>
              )}
              {game.momentumScore !== undefined && game.momentumScore > 0 && (
                <>
                  <span className="text-white/50">·</span>
                  <span className="font-semibold text-red-500">
                    (▲ {game.momentumScore.toLocaleString("ko-KR")}명 급증)
                  </span>
                </>
              )}
            </div>
          )}

          {/* Genre tags */}
          {displayTags.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {displayTags.map((tag) => (
                <span
                  key={tag}
                  className="max-w-[80px] truncate rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Game title */}
          <h3 className="truncate text-sm font-bold leading-snug text-white drop-shadow">
            {getDisplayGameTitle(game)}
          </h3>

          {/* Price */}
          <div className="mt-1">
            {isFree ? (
              <span className="text-xs font-bold text-emerald-400">무료</span>
            ) : hasDiscount ? (
              <span className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium text-red-400">
                  {formatDiscountRate(game.discount_rate)}
                </span>
                <span className="text-xs font-bold text-emerald-400">
                  {formatKRW(game.price_krw)}
                </span>
              </span>
            ) : game.price_krw !== null ? (
              <span className="text-xs font-semibold text-white/80">
                {formatKRW(game.price_krw)}
              </span>
            ) : (
              <span className="text-[10px] text-white/40">가격 정보 없음</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
