import { Suspense } from "react"
import { getTopGameTags, getGamesByTopTagsAND, getStreamStatsMatchingGameDetails } from "@/lib/data"
import { VibeFilter } from "@/components/explore/vibe-filter"
import { GameCard, type GameCardData } from "@/components/game-card"
import type { GameWithTags } from "@/lib/data"

export const dynamic = "force-dynamic"

function toGameCardData(
  game: GameWithTags,
  stats?: { totalViewers: number; liveStreamCount: number }
): GameCardData {
  const topTag = game.top_tags?.[0] ?? game.tags?.[0]?.name
  return {
    id: game.id,
    title: game.title,
    cover_image_url: game.cover_image_url ?? null,
    header_image_url: game.header_image_url ?? undefined,
    price_krw: game.price_krw ?? null,
    original_price_krw: game.original_price_krw ?? null,
    discount_rate: game.discount_rate ?? null,
    is_free: game.is_free ?? null,
    topTag,
    totalViewers: stats?.totalViewers,
    liveStreamCount: stats?.liveStreamCount,
  }
}

interface ExplorePageProps {
  searchParams: { tags?: string }
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  // Parse selected tags from URL (names, may be encoded)
  const tagsParam = searchParams.tags || ""
  const selectedTagNames = tagsParam
    ? tagsParam.split(",").map(t => decodeURIComponent(t.trim())).filter(Boolean)
    : []

  // Fetch top tags from trending games for the filter UI
  const allTags = await getTopGameTags(10)

  const games = selectedTagNames.length > 0
    ? await getGamesByTopTagsAND(selectedTagNames)
    : []
  const streamStats = games.length > 0
    ? await getStreamStatsMatchingGameDetails(games.map((g) => ({ id: g.id, title: g.title })))
    : new Map<number, { totalViewers: number; liveStreamCount: number }>()

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-foreground sm:text-4xl">
            Explore Games
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Find your next favorite game by vibe
          </p>
        </div>

        {/* Filter Section */}
        <div className="mb-8 rounded-xl border border-border bg-card p-6">
          <Suspense fallback={<div className="text-muted-foreground">Loading filters...</div>}>
            <VibeFilter allTags={allTags} selectedTags={selectedTagNames} />
          </Suspense>
        </div>

        {/* Results Section */}
        <div className="mb-4">
          {selectedTagNames.length > 0 ? (
            <h2 className="text-lg font-semibold text-foreground">
              {games.length} game{games.length !== 1 ? "s" : ""} found
            </h2>
          ) : (
            <p className="text-muted-foreground">
              Select tags above to discover games
            </p>
          )}
        </div>

        {/* Game Grid */}
        {selectedTagNames.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {games.length > 0 ? (
              games.map((game) => (
                <GameCard key={game.id} game={toGameCardData(game, streamStats.get(game.id))} />
              ))
            ) : (
              <div className="col-span-full py-12 text-center">
                <p className="text-lg text-muted-foreground">
                  No games found matching these vibes.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try selecting different tags or clear your filters.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
