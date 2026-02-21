"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { GameCard } from "@/components/game-card"
import { StreamCard } from "@/components/stream-card"
import type { TagRow, GameWithTags, TrendingGameRow } from "@/lib/data"
import type { StreamData } from "@/components/stream-card"
import { 
  getTopGameTags, 
  getGamesByTopTagsAND, 
  fetchGamesByViewerCount,
  fetchLiveStreams,
  getStreamsForGames,
  getStreamStatsMatchingGameDetails
} from "@/lib/data"
import { Gamepad2, Check, Radio } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TagSearchInput } from "@/components/explore/tag-search-input"

interface ExploreTabContentProps {
  onStreamClick?: (stream: StreamData) => void
}

export function ExploreTabContent({ onStreamClick }: ExploreTabContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [allTags, setAllTags] = useState<TagRow[]>([])
  const [games, setGames] = useState<any[]>([])
  const [streams, setStreams] = useState<any[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([]) // Tag names for filter
  const [exploreSubTab, setExploreSubTab] = useState<"games" | "live">("games")
  const [isLoading, setIsLoading] = useState(true)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [gamesDisplayCount, setGamesDisplayCount] = useState(8)
  const [streamsDisplayCount, setStreamsDisplayCount] = useState(8)
  const [isGamesLoadingMore, setIsGamesLoadingMore] = useState(false)
  const [isStreamsLoadingMore, setIsStreamsLoadingMore] = useState(false)
  const BATCH_SIZE = 8

  // Reset display count when data source changes (tags selected/cleared)
  useEffect(() => {
    setGamesDisplayCount(BATCH_SIZE)
    setStreamsDisplayCount(BATCH_SIZE)
  }, [selectedTags])

  // Load top tags from trending games on mount
  useEffect(() => {
    async function loadTags() {
      try {
        const tags = await getTopGameTags(10)
        setAllTags(tags)
      } catch (error) {
        console.error("Error loading tags:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadTags()
  }, [])

  // Load initial data: first 8 quickly, then background load more
  useEffect(() => {
    if (selectedTags.length > 0) return

    let gamesAbort = false
    let streamsAbort = false

    async function loadInitialData() {
      setIsDataLoading(true)
      setGames([])
      setStreams([])

      // 1) First batch: 8 games + 8 streams → display ASAP
      try {
        const [firstGames, firstStreams] = await Promise.all([
          fetchGamesByViewerCount(BATCH_SIZE, 0),
          fetchLiveStreams(BATCH_SIZE, 0),
        ])
        if (!gamesAbort) setGames(firstGames)
        if (!streamsAbort) setStreams(firstStreams)
      } catch (error) {
        console.error("Error loading initial data:", error)
      } finally {
        if (!gamesAbort && !streamsAbort) setIsDataLoading(false)
      }

      // 2) Background: load more batches (8 each) - continues after first 8 displayed
      const maxGames = 50
      const maxStreamBatches = 10 // up to 80 streams
      for (let offset = BATCH_SIZE; offset < maxGames; offset += BATCH_SIZE) {
        if (gamesAbort) break
        setIsGamesLoadingMore(true)
        try {
          const nextGames = await fetchGamesByViewerCount(BATCH_SIZE, offset)
          if (gamesAbort) break
          if (nextGames.length === 0) break
          setGames((prev) => [...prev, ...nextGames])
        } catch (e) {
          console.error("Error loading more games:", e)
          break
        } finally {
          if (!gamesAbort) setIsGamesLoadingMore(false)
        }
      }

      for (let offset = BATCH_SIZE; offset < BATCH_SIZE * maxStreamBatches; offset += BATCH_SIZE) {
        if (streamsAbort) break
        setIsStreamsLoadingMore(true)
        try {
          const nextStreams = await fetchLiveStreams(BATCH_SIZE, offset)
          if (streamsAbort) break
          if (nextStreams.length === 0) break
          setStreams((prev) => [...prev, ...nextStreams])
        } catch (e) {
          console.error("Error loading more streams:", e)
          break
        } finally {
          if (!streamsAbort) setIsStreamsLoadingMore(false)
        }
      }
    }

    loadInitialData()
    return () => {
      gamesAbort = true
      streamsAbort = true
    }
  }, [selectedTags])

  // Load filtered games and streams when tags are selected (all at once)
  useEffect(() => {
    if (selectedTags.length === 0) return

    setIsDataLoading(true)
    setGames([])
    setStreams([])
    ;(async function loadFilteredData() {
      try {
        const filteredGames = await getGamesByTopTagsAND(selectedTags)
        const gameIds = filteredGames.map((g) => g.id)
        const [streamStats, filteredStreams] = await Promise.all([
          getStreamStatsMatchingGameDetails(filteredGames.map((g) => ({ id: g.id, title: g.title, korean_title: g.korean_title }))),
          getStreamsForGames(gameIds),
        ])
        const gamesWithStats = filteredGames.map((g) => ({
          ...g,
          totalViewers: streamStats.get(g.id)?.totalViewers ?? 0,
          liveStreamCount: streamStats.get(g.id)?.liveStreamCount ?? 0,
        }))
        gamesWithStats.sort((a, b) => (b.totalViewers ?? 0) - (a.totalViewers ?? 0))
        setGames(gamesWithStats)
        setStreams(filteredStreams)
      } catch (error) {
        console.error("Error loading filtered data:", error)
      } finally {
        setIsDataLoading(false)
      }
    })()
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

  const handleLoadMoreGames = () => {
    setGamesDisplayCount((prev) => prev + BATCH_SIZE)
  }

  const handleLoadMoreStreams = () => {
    setStreamsDisplayCount((prev) => prev + BATCH_SIZE)
  }

  const gamesToShow = games.slice(0, gamesDisplayCount)
  const streamsToShow = streams.slice(0, streamsDisplayCount)
  const hasMoreGames = games.length > gamesDisplayCount || isGamesLoadingMore
  const hasMoreStreams = streams.length > streamsDisplayCount || isStreamsLoadingMore
  const gamesNeedingSkeleton = gamesDisplayCount > games.length && isGamesLoadingMore
  const streamsNeedingSkeleton = streamsDisplayCount > streams.length && isStreamsLoadingMore

  /* Skeleton: 8개 = 2라인 (라인당 4개) */
  const CardGridSkeleton = ({ count = 8 }: { count?: number }) => (
    <div className="card-grid-4-wrapper -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="card-grid-4">
        {Array.from({ length: count }).map((_, i) => (
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
  )

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
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 w-20 animate-pulse rounded-md bg-muted" />
            ))
          ) : (
            <>
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
            </>
          )}
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

      {/* Games / Live Sub-tabs */}
      <Tabs value={exploreSubTab} onValueChange={(v) => setExploreSubTab(v as "games" | "live")} className="w-full">
        <TabsList className="mb-4 h-10 bg-muted/50 p-1">
          <TabsTrigger
            value="games"
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Gamepad2 className="h-4 w-4" />
            Games {selectedTags.length > 0 && `(${games.length})`}
          </TabsTrigger>
          <TabsTrigger
            value="live"
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Radio className="h-4 w-4" />
            Live {selectedTags.length > 0 && `(${streams.length})`}
          </TabsTrigger>
        </TabsList>

        <div className={exploreSubTab === "games" ? "" : "hidden"}>
          <div className="mb-3 text-sm text-muted-foreground">
            시청자 수 순으로 정렬됨
          </div>
          {isDataLoading ? (
            <CardGridSkeleton />
          ) : games.length > 0 ? (
            <div className="space-y-6">
              <div className="card-grid-4-wrapper -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="card-grid-4">
                  {gamesToShow.map((game) => (
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
                  ))}
                </div>
              </div>
              {gamesNeedingSkeleton && <CardGridSkeleton />}
              {hasMoreGames && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleLoadMoreGames}
                    disabled={gamesNeedingSkeleton}
                    className="min-w-[140px] border-border"
                  >
                    {gamesNeedingSkeleton ? "로딩 중..." : "더 보기"}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-lg text-muted-foreground">
                No games found matching these tags.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try selecting different tags or clear your filters.
              </p>
            </div>
          )}
        </div>

        <div className={exploreSubTab === "live" ? "" : "hidden"}>
          <div className="mb-3 text-sm text-muted-foreground">
            시청자 수 순으로 정렬됨
          </div>
          {isDataLoading ? (
            <CardGridSkeleton />
          ) : streams.length > 0 ? (
            <div className="space-y-6">
              <div className="card-grid-4-wrapper -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="card-grid-4">
                  {streamsToShow.map((stream) => (
                    <StreamCard key={stream.id} stream={stream} onStreamClick={onStreamClick} />
                  ))}
                </div>
              </div>
              {streamsNeedingSkeleton && <CardGridSkeleton />}
              {hasMoreStreams && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleLoadMoreStreams}
                    disabled={streamsNeedingSkeleton}
                    className="min-w-[140px] border-border"
                  >
                    {streamsNeedingSkeleton ? "로딩 중..." : "더 보기"}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center">
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
      </Tabs>
    </div>
  )
}
