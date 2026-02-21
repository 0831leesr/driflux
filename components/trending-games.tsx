"use client"

import { useEffect, useState } from "react"
import { Flame } from "lucide-react"
import { GameCard, type GameCardData } from "@/components/game-card"
import { fetchTrendingGames, type TrendingGameRow } from "@/lib/data"

export function TrendingGames() {
  const [trendingGames, setTrendingGames] = useState<GameCardData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadTrendingGames() {
      try {
        const games = await fetchTrendingGames()
        
        // trending_games 뷰: title, cover_image_url, stream_count, total_viewers, trend_score
        const cardData: GameCardData[] = games.map((game) => ({
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
        
        setTrendingGames(cardData)
      } catch (error) {
        console.error("Error loading trending games:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadTrendingGames()
  }, [])

  if (isLoading) {
    return (
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
          <Flame className="h-5 w-5 text-orange-400" />
          Now Trending (Don{"'"}t Miss Out)
        </h2>
        <div className="card-grid-4-wrapper -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="card-grid-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border bg-card animate-pulse">
              <div className="aspect-[16/9] w-full bg-muted" />
              <div className="p-3">
                <div className="mb-2 h-5 w-3/4 rounded bg-muted" />
                <div className="h-4 w-1/2 rounded bg-muted" />
              </div>
            </div>
          ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
        <Flame className="h-5 w-5 text-orange-400" />
        Now Trending (Don{"'"}t Miss Out)
      </h2>
      <div className="card-grid-4-wrapper -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="card-grid-4">
        {trendingGames.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
        </div>
      </div>
    </section>
  )
}
