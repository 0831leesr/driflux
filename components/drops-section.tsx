"use client"

import { Gift } from "lucide-react"
import { GameCard, type GameCardData } from "@/components/game-card"
import type { GamesWithDropsRow } from "@/lib/data"

function toCardData(games: GamesWithDropsRow[]): GameCardData[] {
  return games.map((game) => ({
    id: game.id,
    title: game.title,
    cover_image_url: game.cover_image_url,
    header_image_url: game.header_image_url ?? game.cover_image_url ?? undefined,
    price_krw: null,
    original_price_krw: null,
    discount_rate: null,
    is_free: null,
    totalViewers: game.totalViewers,
    showDropsBadge: true,
  }))
}

export function DropsSection({ games }: { games: GamesWithDropsRow[] }) {
  if (!games || games.length === 0) return null

  const cardData = toCardData(games)

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
        <Gift className="h-5 w-5 text-amber-400" />
        드롭스 & 이벤트
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
