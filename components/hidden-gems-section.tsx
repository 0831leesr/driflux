"use client"

import { Gem } from "lucide-react"
import { GameCard, type GameCardData } from "@/components/game-card"
import type { HiddenGemsRow } from "@/lib/data"
import { buildFeatureTags } from "@/lib/feature-tags"

function toCardData(games: HiddenGemsRow[], yesterdayTrendingIds: Set<number>): GameCardData[] {
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
    featureTags: buildFeatureTags({
      isTrending: yesterdayTrendingIds.has(game.id),
    }),
  }))
}

export function HiddenGemsSection({ games, yesterdayTrendingIds }: { games: HiddenGemsRow[]; yesterdayTrendingIds: Set<number> }) {
  if (!games || games.length === 0) return null

  const cardData = toCardData(games, yesterdayTrendingIds)

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
        <Gem className="h-5 w-5 text-cyan-400" />
        <span>숨겨진 게임 발견</span>
      </h2>
      <div className="card-grid-4-wrapper -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="card-grid-4">
          {cardData.map((game, index) => (
            <GameCard key={game.id} game={game} priority={index < 4} />
          ))}
        </div>
      </div>
    </section>
  )
}
