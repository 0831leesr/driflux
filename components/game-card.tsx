"use client"

import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Heart, Users, Radio } from "lucide-react"
import { formatKRW, formatDiscountRate, formatViewerCountShort, getGameImageSrc, FALLBACK_IMAGE_URL } from "@/lib/utils"
import { useFavoriteGames } from "@/contexts/favorites-context"
import { Button } from "@/components/ui/button"

export interface GameCardData {
  id: number
  title: string
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
}

export function GameCard({ game }: { game: GameCardData }) {
  const displayImage = getGameImageSrc(game.header_image_url, game.cover_image_url)
  const hasDiscount = game.discount_rate && game.discount_rate > 0
  const isFree = game.is_free || game.price_krw === 0
  
  const { isFavorite, toggleFavorite } = useFavoriteGames()
  const isGameFavorite = isFavorite(game.id)

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault() // Prevent navigation when clicking the heart button
    e.stopPropagation()
    toggleFavorite(game.id)
  }

  return (
    <Link
      href={`/game/${game.id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-[hsl(var(--neon-purple))]/40 hover:shadow-lg hover:shadow-[hsl(var(--neon-purple))]/5"
    >
      {/* Game Image */}
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        <Image
          src={displayImage}
          alt={game.title}
          fill
          placeholder="empty"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
          unoptimized={displayImage === FALLBACK_IMAGE_URL}
        />

        {/* Favorite Button (Heart) */}
        <div className="absolute left-2 top-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleFavoriteClick}
            className={`h-8 w-8 rounded-full backdrop-blur-sm transition-all ${
              isGameFavorite
                ? "bg-red-500/90 text-white hover:bg-red-600/90"
                : "bg-black/40 text-white hover:bg-black/60"
            }`}
            aria-label={isGameFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart 
              className={`h-4 w-4 transition-all ${
                isGameFavorite ? "fill-current" : ""
              }`}
            />
          </Button>
        </div>

        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute right-2 top-2">
            <Badge className="border-transparent bg-gradient-to-r from-amber-500 to-red-500 px-2 py-1 text-xs font-bold text-white">
              {formatDiscountRate(game.discount_rate)}
            </Badge>
          </div>
        )}
      </div>

      {/* Game Info */}
      <div className="p-3">
        <h3 className="mb-2 truncate text-base font-bold text-foreground">
          {game.title}
        </h3>

        {/* Streaming Stats (if available) */}
        {(game.totalViewers !== undefined || game.liveStreamCount !== undefined) && (
          <div className="mb-2 flex items-center gap-3 text-xs text-muted-foreground">
            {game.liveStreamCount !== undefined && game.liveStreamCount > 0 && (
              <div className="flex items-center gap-1">
                <Radio className="h-3 w-3 text-red-500" />
                <span>{game.liveStreamCount}개 방송</span>
              </div>
            )}
            {game.totalViewers !== undefined && game.totalViewers > 0 && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-[hsl(var(--neon-purple))]" />
                <span>{formatViewerCountShort(game.totalViewers)} 시청</span>
              </div>
            )}
          </div>
        )}

        {/* Top Tag Badge */}
        {game.topTag && (
          <Badge className="mb-2 border-transparent bg-[hsl(var(--neon-purple))]/15 px-1.5 py-0 text-[10px] font-medium text-[hsl(var(--neon-purple))]">
            #{game.topTag}
          </Badge>
        )}

        {/* Price Display */}
        <div className="flex items-center gap-2">
          {isFree ? (
            <Badge className="border-transparent bg-[hsl(var(--neon-green))]/15 px-2 py-1 text-xs font-bold text-[hsl(var(--neon-green))]">
              무료 플레이
            </Badge>
          ) : hasDiscount ? (
            <>
              {/* Original Price (Strikethrough) */}
              <span className="text-xs text-muted-foreground line-through">
                {formatKRW(game.original_price_krw)}
              </span>
              {/* Discounted Price */}
              <span className="text-sm font-bold text-amber-400">
                {formatKRW(game.price_krw)}
              </span>
            </>
          ) : game.price_krw !== null ? (
            <span className="text-sm font-semibold text-foreground">
              {formatKRW(game.price_krw)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">가격 정보 없음</span>
          )}
        </div>
      </div>
    </Link>
  )
}
