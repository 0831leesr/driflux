"use client"

import { Flame } from "lucide-react"
import { GameCard, type GameCardData } from "@/components/game-card"
import type { TrendingGameRow } from "@/lib/data"

function toCardData(games: TrendingGameRow[]): GameCardData[] {
  return games.map((game) => ({
    id: game.id,
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
  }))
}

export function TrendingGames({ games }: { games: TrendingGameRow[] }) {
  const trendingGames = toCardData(games)

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
        <Flame className="h-5 w-5 text-orange-400" />
        Now Trending (Don{"'"}t Miss Out)
      </h2>
      <div className="card-grid-4-wrapper -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="card-grid-4">
        {trendingGames.map((game, index) => (
          <GameCard key={game.id} game={game} priority={index < 4} />
        ))}
        </div>
      </div>
    </section>
  )
}
