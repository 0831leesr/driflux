"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ChevronDown,
  Crown,
  DollarSign,
  Flame,
  Gem,
  Skull,
  Swords,
  Crosshair,
  Shield,
  Map,
  Joystick,
  Layers,
  Wand2,
  Check,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GameCard } from "@/components/game-card"
import { StreamCard, type StreamData } from "@/components/stream-card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getTagSlug } from "@/lib/game-helpers"
import { fetchSaleGames, fetchLiveStreams, type GameRow } from "@/lib/data"

/* ── Vibe Tag Options ── */
const DEFAULT_VIBE_TAGS = [
  "Horror",
  "Co-op",
  "Roguelike",
  "Soulslike",
  "Indie",
  "RPG",
  "Open World",
  "FPS",
]

/* ── Genre Categories ── */
const GENRES = [
  { name: "FPS", icon: Crosshair, count: "2.4K streams" },
  { name: "RPG", icon: Shield, count: "1.8K streams" },
  { name: "Strategy", icon: Layers, count: "950 streams" },
  { name: "Simulation", icon: Joystick, count: "720 streams" },
  { name: "Action RPG", icon: Swords, count: "1.5K streams" },
  { name: "Adventure", icon: Map, count: "1.1K streams" },
  { name: "Horror", icon: Skull, count: "680 streams" },
  { name: "Roguelike", icon: Wand2, count: "540 streams" },
]

/* ── Filter Bar ── */
function ExploreFilterBar({
  selectedTags,
  onTagsChange,
  saleOnly,
  onSaleOnlyChange,
  veteransOnly,
  onVeteransOnlyChange,
  sortBy,
  onSortByChange,
}: {
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  saleOnly: boolean
  onSaleOnlyChange: (v: boolean) => void
  veteransOnly: boolean
  onVeteransOnlyChange: (v: boolean) => void
  sortBy: string
  onSortByChange: (v: string) => void
}) {
  function toggleTag(tag: string) {
    onTagsChange(
      selectedTags.includes(tag)
        ? selectedTags.filter((t) => t !== tag)
        : [...selectedTags, tag],
    )
  }

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/80 p-3 backdrop-blur-xl">
      {/* Vibe Search Multi-Select */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-8 gap-1.5 border-border bg-secondary text-sm text-foreground hover:bg-secondary/80"
          >
            <span className="text-muted-foreground">Vibe:</span>
            {selectedTags.length > 0 ? (
              <span className="text-[hsl(var(--neon-purple))]">
                {selectedTags.length} selected
              </span>
            ) : (
              <span className="text-muted-foreground">All</span>
            )}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-56 border-border bg-card p-2"
          align="start"
        >
          <div className="flex flex-col gap-0.5">
            {DEFAULT_VIBE_TAGS.map((tag) => {
              const isActive = selectedTags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-[hsl(var(--neon-purple))]/15 text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                      isActive
                        ? "border-[hsl(var(--neon-purple))] bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))]"
                        : "border-muted-foreground"
                    }`}
                  >
                    {isActive && <Check className="h-3 w-3" />}
                  </span>
                  {tag}
                </button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Sale Only Toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onSaleOnlyChange(!saleOnly)}
        className={`h-8 gap-1.5 border-border text-sm ${
          saleOnly
            ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/20 hover:text-amber-400"
            : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
        }`}
      >
        <DollarSign className="h-3.5 w-3.5" />
        On Sale Only
      </Button>

      {/* Veterans Only Toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onVeteransOnlyChange(!veteransOnly)}
        className={`h-8 gap-1.5 border-border text-sm ${
          veteransOnly
            ? "bg-[hsl(var(--neon-purple))]/15 text-[hsl(var(--neon-purple))] hover:bg-[hsl(var(--neon-purple))]/20 hover:text-[hsl(var(--neon-purple))]"
            : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
        }`}
      >
        <Crown className="h-3.5 w-3.5" />
        Veterans Only (100h+)
      </Button>

      {/* Sort By */}
      <div className="ml-auto">
        <Select value={sortBy} onValueChange={onSortByChange}>
          <SelectTrigger className="h-8 w-40 border-border bg-secondary text-sm text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-border bg-card text-foreground">
            <SelectItem value="viewers">Viewer Count</SelectItem>
            <SelectItem value="discount">Discount Rate</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

/* ── Sale Spotlight Section ── */
function SaleSpotlightSection({ saleGames }: { saleGames: GameRow[] }) {
  if (saleGames.length === 0) {
    return null
  }

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
        <DollarSign className="h-5 w-5 text-amber-400" />
        Steam Sale Spotlight
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {saleGames.slice(0, 8).map((game) => (
          <GameCard
            key={game.id}
            game={{
              id: game.id,
              title: game.title,
              cover_image_url: game.cover_image_url,
              header_image_url: game.header_image_url ?? undefined,
              price_krw: game.price_krw ?? null,
              original_price_krw: game.original_price_krw ?? null,
              discount_rate: game.discount_rate ?? null,
              is_free: game.is_free ?? null,
            }}
          />
        ))}
      </div>
    </section>
  )
}

/* ── Live Streams Section ── */
function LiveStreamsSection({ 
  streams, 
  onStreamClick, 
  title = "Live Streams",
  icon = <Flame className="h-5 w-5 text-orange-400" />,
  description
}: { 
  streams: StreamData[]
  onStreamClick?: (stream: StreamData) => void
  title?: string
  icon?: React.ReactNode
  description?: string
}) {
  if (streams.length === 0) {
    return null
  }

  return (
    <section>
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-foreground">
        {icon}
        {title}
      </h2>
      {description && (
        <p className="mb-4 text-sm text-muted-foreground">
          {description}
        </p>
      )}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {streams.slice(0, 8).map((s, i) => (
          <StreamCard key={`${s.streamerName}-${i}`} stream={s} onStreamClick={onStreamClick} />
        ))}
      </div>
    </section>
  )
}

/* ── Browse by Genre ── */
function BrowseByGenre() {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
        <Layers className="h-5 w-5 text-[hsl(var(--neon-purple))]" />
        Browse by Genre
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {GENRES.map((genre) => {
          const Icon = genre.icon
          const genreSlug = getTagSlug(genre.name)
          
          return (
            <Link
              key={genre.name}
              href={`/tags/${genreSlug}`}
              className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5 transition-all hover:border-[hsl(var(--neon-purple))]/50 hover:bg-secondary hover:shadow-lg hover:shadow-[hsl(var(--neon-purple))]/5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary transition-colors group-hover:bg-[hsl(var(--neon-purple))]/15">
                <Icon className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-[hsl(var(--neon-purple))]" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                {genre.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {genre.count}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

/* ── Main Export ── */
export function ExploreContent({ onStreamClick }: { onStreamClick?: () => void }) {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [saleOnly, setSaleOnly] = useState(false)
  const [veteransOnly, setVeteransOnly] = useState(false)
  const [sortBy, setSortBy] = useState("viewers")
  const [saleGames, setSaleGames] = useState<GameRow[]>([])
  const [liveStreams, setLiveStreams] = useState<StreamData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [sales, streams] = await Promise.all([
          fetchSaleGames(),
          fetchLiveStreams(),
        ])
        
        setSaleGames(sales as any[])
        setLiveStreams(streams)
      } catch (error) {
        console.error("Error loading explore data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 p-4 lg:p-6">
        <div className="animate-pulse">
          <div className="mb-4 h-8 w-64 rounded bg-muted" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Split streams into different categories
  // viewers is a number, so we can compare directly
  const highViewerStreams = liveStreams.filter(s => s.viewers && s.viewers > 15000)
  const allStreams = liveStreams

  return (
    <div className="flex flex-col gap-8 p-4 lg:p-6">
      <ExploreFilterBar
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        saleOnly={saleOnly}
        onSaleOnlyChange={setSaleOnly}
        veteransOnly={veteransOnly}
        onVeteransOnlyChange={setVeteransOnly}
        sortBy={sortBy}
        onSortByChange={setSortBy}
      />
      <SaleSpotlightSection saleGames={saleGames} />
      <LiveStreamsSection 
        streams={highViewerStreams}
        onStreamClick={onStreamClick}
        title="Popular Live Streams"
        icon={<Gem className="h-5 w-5 text-cyan-400" />}
        description="High viewer count streams you don't want to miss"
      />
      <LiveStreamsSection 
        streams={allStreams}
        onStreamClick={onStreamClick}
        title="All Live Streams"
        icon={<Skull className="h-5 w-5 text-red-400" />}
        description="Browse all currently live streams"
      />
      <BrowseByGenre />
    </div>
  )
}
