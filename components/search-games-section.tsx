"use client"

import { Gamepad2 } from "lucide-react"
import { GameCard, type GameCardData } from "@/components/game-card"
import type { GameWithTags } from "@/lib/data"

interface StreamStats {
  totalViewers: number
  liveStreamCount: number
}

interface SearchGamesSectionProps {
  games: GameWithTags[]
  streamStats: Record<number, StreamStats>
  query: string
}

function getTopTag(game: GameWithTags): string | undefined {
  const fromTopTags =
    game.top_tags && Array.isArray(game.top_tags) && game.top_tags.length > 0
      ? game.top_tags[0]
      : undefined
  const fromTags = game.tags?.[0]?.name
  return fromTopTags ?? fromTags
}

function toGameCardData(
  game: GameWithTags,
  streamStats: Record<number, StreamStats>
): GameCardData {
  const stats = streamStats[game.id]
  return {
    id: game.id,
    title: game.title,
    korean_title: game.korean_title ?? undefined,
    cover_image_url: game.cover_image_url ?? null,
    header_image_url: game.header_image_url ?? null,
    price_krw: game.price_krw ?? null,
    original_price_krw: game.original_price_krw ?? null,
    discount_rate: game.discount_rate ?? null,
    is_free: game.is_free ?? null,
    totalViewers: stats?.totalViewers,
    liveStreamCount: stats?.liveStreamCount,
    topTag: getTopTag(game),
  }
}

export function SearchGamesSection({ games, streamStats, query }: SearchGamesSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        Games matching &apos;{query}&apos;
      </h2>
      {games.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {games.map((game) => (
            <GameCard key={game.id} game={toGameCardData(game, streamStats)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Gamepad2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">일치하는 게임이 없습니다.</p>
        </div>
      )}
    </section>
  )
}
