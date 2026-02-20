"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { GameCard } from "@/components/game-card"
import { StreamCard } from "@/components/stream-card"
import type { TagRow, GameWithTags, TrendingGameRow } from "@/lib/data"
import { 
  getTopGameTags, 
  getGamesByTopTagsAND, 
  fetchTrendingGames,
  fetchLiveStreams,
  getStreamsForGames,
  getStreamStatsMatchingGameDetails
} from "@/lib/data"
import { Gamepad2, Flame, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TagSearchInput } from "@/components/explore/tag-search-input"

export function ExploreTabContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [allTags, setAllTags] = useState<TagRow[]>([])
  const [games, setGames] = useState<any[]>([])
  const [streams, setStreams] = useState<any[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([]) // Tag names for filter
  const [isLoading, setIsLoading] = useState(true)

  // Load top tags from trending games on mount
  useEffect(() => {
    async function loadTags() {
      try {
        const tags = await getTopGameTags(10) // Get top 10 tags from trending games
        setAllTags(tags)
      } catch (error) {
        console.error("Error loading tags:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadTags()
  }, [])

  // Load initial data (trending games + live streams)
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [trendingGames, liveStreams] = await Promise.all([
          fetchTrendingGames(),
          fetchLiveStreams()
        ])
        setGames(trendingGames)
        setStreams(liveStreams)
      } catch (error) {
        console.error("Error loading initial data:", error)
      }
    }
    
    // Only load initial data if no tags selected
    if (selectedTags.length === 0) {
      loadInitialData()
    }
  }, [selectedTags])

  // Load filtered games and streams when tags are selected
  useEffect(() => {
    async function loadFilteredData() {
      if (selectedTags.length === 0) {
        return // Initial data will be loaded by the other effect
      }

      try {
        // selectedTags are tag names
        const filteredGames = await getGamesByTopTagsAND(selectedTags)
        const gameIds = filteredGames.map(g => g.id)
        const [streamStats, filteredStreams] = await Promise.all([
          getStreamStatsMatchingGameDetails(filteredGames.map(g => ({ id: g.id, title: g.title }))),
          getStreamsForGames(gameIds),
        ])
        const gamesWithStats = filteredGames.map(g => ({
          ...g,
          totalViewers: streamStats.get(g.id)?.totalViewers ?? 0,
          liveStreamCount: streamStats.get(g.id)?.liveStreamCount ?? 0,
        }))
        setGames(gamesWithStats)
        setStreams(filteredStreams)
      } catch (error) {
        console.error("Error loading filtered data:", error)
      }
    }
    
    if (selectedTags.length > 0) {
      loadFilteredData()
    }
  }, [selectedTags])

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    )
  }

  const addTag = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      setSelectedTags((prev) => [...prev, tagName])
    }
  }

  const clearAllTags = () => {
    setSelectedTags([])
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-4 lg:p-6">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-4 lg:p-6">
      {/* Header */}
      <div>
        <h1 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">
          Explore Games
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Find your next favorite game by vibe
        </p>
      </div>

      {/* Filter Section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Filter by Vibe
            </h2>
            <p className="text-sm text-muted-foreground">
              Select tags to find games that match your mood
            </p>
          </div>
          <TagSearchInput
            onAddTag={addTag}
            selectedTags={selectedTags}
            placeholder="태그 검색..."
          />
        </div>

        {/* Tag Filter Chips */}
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => {
            const isSelected = selectedTags.includes(tag.name)

            return (
              <Badge
                key={tag.id}
                variant={isSelected ? "default" : "outline"}
                className={`cursor-pointer select-none gap-1.5 px-4 py-2 text-sm font-medium transition-all hover:scale-105 ${
                  isSelected
                    ? "border-2 border-[hsl(var(--neon-purple))] bg-[hsl(var(--neon-purple))] !text-[hsl(var(--primary-foreground))] shadow-md hover:bg-[hsl(var(--neon-purple))]/90 hover:shadow-lg [&_svg]:text-[hsl(var(--primary-foreground))]"
                    : "border border-border bg-card/50 text-muted-foreground hover:border-[hsl(var(--neon-purple))]/40 hover:bg-card hover:text-foreground"
                }`}
                onClick={() => toggleTag(tag.name)}
              >
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                {tag.name}
              </Badge>
            )
          })}
          {/* Custom tags added via search */}
          {selectedTags
            .filter((name) => !allTags.some((t) => t.name === name))
            .map((tagName) => (
              <Badge
                key={tagName}
                variant="default"
                className="cursor-pointer select-none gap-1.5 border-2 border-[hsl(var(--neon-purple))] bg-[hsl(var(--neon-purple))] px-4 py-2 text-sm font-medium !text-[hsl(var(--primary-foreground))] shadow-md transition-all hover:scale-105 hover:bg-[hsl(var(--neon-purple))]/90 hover:shadow-lg [&_svg]:text-[hsl(var(--primary-foreground))]"
                onClick={() => toggleTag(tagName)}
              >
                <Check className="h-3.5 w-3.5 shrink-0" />
                {tagName}
              </Badge>
            ))}
        </div>

        {/* Selected Tags Counter */}
        {selectedTags.length > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {selectedTags.length} tag{selectedTags.length > 1 ? "s" : ""} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllTags}
              className="h-8 border-border px-3 text-xs"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Games Section */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Gamepad2 className="h-5 w-5 text-[hsl(var(--neon-purple))]" />
          <h2 className="text-lg font-semibold text-foreground">
            {selectedTags.length > 0 
              ? `Games (${games.length})`
              : "Trending Games"
            }
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {games.length > 0 ? (
            games.map((game) => (
              <GameCard
                key={game.id}
                game={{
                  id: game.id,
                  title: game.title,
                  korean_title: game.korean_title ?? undefined,
                  cover_image_url: game.cover_image_url ?? null,
                  header_image_url: game.header_image_url ?? undefined,
                  price_krw: game.price_krw ?? null,
                  original_price_krw: game.original_price_krw ?? null,
                  discount_rate: game.discount_rate ?? null,
                  is_free: game.is_free ?? null,
                  topTag: game.top_tags?.[0] ?? game.tags?.[0]?.name,
                  totalViewers: game.totalViewers,
                  liveStreamCount: game.liveStreamCount,
                }}
              />
            ))
          ) : (
            <div className="col-span-full py-12 text-center">
              <p className="text-lg text-muted-foreground">
                No games found matching these tags.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try selecting different tags or clear your filters.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Streams Section */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-400" />
          <h2 className="text-lg font-semibold text-foreground">
            {selectedTags.length > 0 
              ? `Live Streams (${streams.length})`
              : "Popular Live Streams"
            }
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {streams.length > 0 ? (
            streams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))
          ) : (
            <div className="col-span-full py-12 text-center">
              <p className="text-lg text-muted-foreground">
                No live streams found for these games.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedTags.length > 0 
                  ? "Try selecting different tags or check back later."
                  : "No streams are currently live."
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
