"use client"

import { useRef } from "react"
import Image from "next/image"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Flame,
  Radio,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StreamCard, type StreamData } from "@/components/stream-card"
import type { TagRow } from "@/lib/data"
import { getGameImageSrc } from "@/lib/utils"

/* ── Genre Data ── */
interface GenreInfo {
  name: string
  viewers: string
  activeStreams: number
  description: string
}

const GENRE_DB: Record<string, GenreInfo> = {
  horror: {
    name: "Horror",
    viewers: "15.2K",
    activeStreams: 120,
    description: "Face your fears with terrifying gameplay and spine-chilling atmospheres.",
  },
  "co-op": {
    name: "Co-op",
    viewers: "28.4K",
    activeStreams: 340,
    description: "Team up with friends and conquer challenges together.",
  },
  soulslike: {
    name: "Soulslike",
    viewers: "19.7K",
    activeStreams: 185,
    description: "Punishing difficulty, rewarding mastery. Only the dedicated survive.",
  },
  indie: {
    name: "Indie",
    viewers: "11.3K",
    activeStreams: 210,
    description: "Discover hidden gems from passionate independent developers.",
  },
  rpg: {
    name: "RPG",
    viewers: "35.6K",
    activeStreams: 420,
    description: "Epic stories, deep character systems, and sprawling worlds to explore.",
  },
  "open world": {
    name: "Open World",
    viewers: "22.1K",
    activeStreams: 280,
    description: "Boundless exploration across vast, immersive landscapes.",
  },
  fps: {
    name: "FPS",
    viewers: "52.8K",
    activeStreams: 580,
    description: "Fast-paced action and precision aiming in competitive shooters.",
  },
  roguelike: {
    name: "Roguelike",
    viewers: "8.9K",
    activeStreams: 95,
    description: "Procedurally generated runs where every attempt is unique.",
  },
  strategy: {
    name: "Strategy",
    viewers: "12.4K",
    activeStreams: 150,
    description: "Outsmart your opponents with tactical thinking and careful planning.",
  },
  simulation: {
    name: "Simulation",
    viewers: "9.1K",
    activeStreams: 110,
    description: "Realistic experiences that let you build, manage, and simulate.",
  },
  "action rpg": {
    name: "Action RPG",
    viewers: "29.3K",
    activeStreams: 310,
    description: "Combine intense combat with deep progression and loot systems.",
  },
  adventure: {
    name: "Adventure",
    viewers: "14.7K",
    activeStreams: 175,
    description: "Embark on unforgettable journeys filled with discovery and wonder.",
  },
}

/* ── Top Rated Games per Genre ── */
interface TopGame {
  name: string
  cover: string
  viewers: string
  liveStreams: number
}

function getTopGames(genreSlug: string): TopGame[] {
  const genreGames: Record<string, TopGame[]> = {
    horror: [
      { name: "Resident Evil 4", cover: "/games/cyberpunk.jpg", viewers: "18.3K", liveStreams: 45 },
      { name: "Dead Space", cover: "/games/hollow-knight.jpg", viewers: "12.1K", liveStreams: 32 },
      { name: "Amnesia: The Bunker", cover: "/games/baldurs-gate.jpg", viewers: "8.7K", liveStreams: 21 },
      { name: "Silent Hill 2", cover: "/games/elden-ring.jpg", viewers: "15.4K", liveStreams: 38 },
      { name: "Outlast Trials", cover: "/games/helldivers.jpg", viewers: "6.2K", liveStreams: 18 },
    ],
    fps: [
      { name: "Valorant", cover: "/games/valorant.jpg", viewers: "42.3K", liveStreams: 320 },
      { name: "Counter-Strike 2", cover: "/games/cyberpunk.jpg", viewers: "38.1K", liveStreams: 280 },
      { name: "Overwatch 2", cover: "/games/helldivers.jpg", viewers: "22.7K", liveStreams: 150 },
      { name: "Apex Legends", cover: "/games/elden-ring.jpg", viewers: "19.4K", liveStreams: 120 },
      { name: "Call of Duty: MW3", cover: "/games/baldurs-gate.jpg", viewers: "15.8K", liveStreams: 95 },
    ],
    rpg: [
      { name: "Baldur's Gate 3", cover: "/games/baldurs-gate.jpg", viewers: "9.2K", liveStreams: 95 },
      { name: "Elden Ring", cover: "/games/elden-ring.jpg", viewers: "12.5K", liveStreams: 150 },
      { name: "Cyberpunk 2077", cover: "/games/cyberpunk.jpg", viewers: "8.7K", liveStreams: 89 },
      { name: "Divinity: Original Sin 2", cover: "/games/hollow-knight.jpg", viewers: "4.3K", liveStreams: 35 },
      { name: "Dragon Age: Veilguard", cover: "/games/valorant.jpg", viewers: "7.1K", liveStreams: 62 },
    ],
    soulslike: [
      { name: "Elden Ring", cover: "/games/elden-ring.jpg", viewers: "12.5K", liveStreams: 150 },
      { name: "Sekiro", cover: "/games/cyberpunk.jpg", viewers: "6.8K", liveStreams: 48 },
      { name: "Lies of P", cover: "/games/valorant.jpg", viewers: "5.1K", liveStreams: 35 },
      { name: "Dark Souls III", cover: "/games/baldurs-gate.jpg", viewers: "4.2K", liveStreams: 28 },
      { name: "Hollow Knight", cover: "/games/hollow-knight.jpg", viewers: "3.2K", liveStreams: 42 },
    ],
  }

  return genreGames[genreSlug] || [
    { name: "Elden Ring", cover: "/games/elden-ring.jpg", viewers: "12.5K", liveStreams: 150 },
    { name: "Cyberpunk 2077", cover: "/games/cyberpunk.jpg", viewers: "8.7K", liveStreams: 89 },
    { name: "Baldur's Gate 3", cover: "/games/baldurs-gate.jpg", viewers: "9.2K", liveStreams: 95 },
    { name: "Valorant", cover: "/games/valorant.jpg", viewers: "42.3K", liveStreams: 320 },
    { name: "Helldivers 2", cover: "/games/helldivers.jpg", viewers: "15.9K", liveStreams: 204 },
  ]
}

/* ── Live Streams per Genre ── */
function getGenreStreams(genreSlug: string): StreamData[] {
  const genre = GENRE_DB[genreSlug]
  if (!genre) return []

  const covers = ["/games/elden-ring.jpg", "/games/cyberpunk.jpg", "/games/valorant.jpg", "/games/baldurs-gate.jpg", "/games/helldivers.jpg", "/games/hollow-knight.jpg"]
  const thumbs = ["/streams/stream-1.jpg", "/streams/stream-2.jpg", "/streams/stream-3.jpg", "/streams/stream-4.jpg", "/streams/stream-5.jpg", "/streams/stream-6.jpg", "/streams/stream-7.jpg", "/streams/stream-8.jpg"]
  const names = ["NightOwlGamer", "ProGamerX", "CasualVibes", "SpeedRunner99", "TwitchLegend", "ChillStreamer", "DarkSoulsVet", "BugHunterPro"]
  const gameTitles = [`${genre.name} Master`, `${genre.name} Run`, `${genre.name} Challenge`, `Chill ${genre.name}`, `Hardcore ${genre.name}`, `New to ${genre.name}`]
  const streamTitles = [
    "All Bosses No-Hit Attempt",
    "Blind First Playthrough - Day 1",
    "Speedrun WR Practice",
    "Chill Vibes + Chat Picks the Build",
    "100% Completion Marathon",
    "Hardest Difficulty Solo",
    "Community Challenge Run",
    "Exploring Every Secret",
  ]
  const playtimes = ["600h", "3h", "450h", "12h", "1800h", "280h", "45h", "920h"]

  return Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    thumbnail: thumbs[i % thumbs.length],
    gameCover: covers[i % covers.length],
    gameTitle: gameTitles[i % gameTitles.length],
    streamTitle: streamTitles[i % streamTitles.length],
    streamerName: names[i % names.length],
    viewers: Math.floor(Math.random() * 30000 + 1000),
    viewersFormatted: `${(Math.random() * 30 + 1).toFixed(1)}K`,
    playtime: playtimes[i % playtimes.length],
  }))
}

/* ── Main Genre Details Component ── */
export function GenreDetails({
  genreSlug,
  onBack,
  onGameClick,
  onStreamClick,
}: {
  genreSlug: string
  onBack: () => void
  onGameClick?: (title: string) => void
  onStreamClick?: (stream: StreamData) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const genre = GENRE_DB[genreSlug]

  if (!genre) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <p className="text-muted-foreground">Genre not found.</p>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    )
  }

  const topGames = getTopGames(genreSlug)
  const liveStreams = getGenreStreams(genreSlug)

  function scroll(direction: "left" | "right") {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({
      left: direction === "left" ? -280 : 280,
      behavior: "smooth",
    })
  }

  return (
    <div className="flex flex-col">
      {/* Back Button */}
      <div className="px-4 pt-4 lg:px-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Genre Hero Section */}
      <div className="relative mx-4 mt-3 overflow-hidden rounded-2xl border border-border lg:mx-6">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--neon-purple))]/20 via-card to-[hsl(var(--neon-green))]/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--neon-purple)/0.15),transparent_60%)]" />

        <div className="relative flex flex-col gap-4 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <Badge className="border-transparent bg-[hsl(var(--neon-purple))]/20 px-3 py-1 text-sm font-semibold text-[hsl(var(--neon-purple))]">
              #{genre.name}
            </Badge>
          </div>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {genre.name} Games
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            {genre.description}
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-5 text-sm">
            <span className="flex items-center gap-1.5 text-foreground">
              <Users className="h-4 w-4 text-[hsl(var(--neon-purple))]" />
              <span className="font-semibold">{genre.viewers}</span>
              <span className="text-muted-foreground">Viewers Watching</span>
            </span>
            <span className="flex items-center gap-1.5 text-foreground">
              <Radio className="h-4 w-4 text-[hsl(var(--live-red))]" />
              <span className="font-semibold">{genre.activeStreams}</span>
              <span className="text-muted-foreground">Active Streams</span>
            </span>
          </div>
        </div>
      </div>

      {/* Section 1: Top Rated Games - Carousel */}
      <section className="mt-8 px-4 lg:px-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Flame className="h-5 w-5 text-amber-400" />
            {"Top Rated " + genre.name + " Games"}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => scroll("left")}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => scroll("right")}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2"
          style={{ scrollbarWidth: "none" }}
        >
          {topGames.map((game) => (
            <button
              key={game.name}
              type="button"
              onClick={() => onGameClick?.(game.name)}
              className="group flex w-44 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-[hsl(var(--neon-purple))]/50 hover:shadow-lg hover:shadow-[hsl(var(--neon-purple))]/5"
            >
              {/* Portrait Cover */}
              <div className="relative aspect-[3/4] w-full overflow-hidden">
                <Image
                  src={getGameImageSrc(game.cover, "cover")}
                  alt={game.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="176px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
              </div>
              {/* Info */}
              <div className="flex flex-col gap-1 px-3 pb-3 pt-2">
                <p className="truncate text-left text-sm font-bold text-foreground">
                  {game.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {game.viewers}
                  </span>
                  <span className="flex items-center gap-1">
                    <Radio className="h-3 w-3 text-[hsl(var(--live-red))]" />
                    {game.liveStreams}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Section 2: Live Streams - Grid */}
      <section className="mt-8 px-4 pb-8 lg:px-6">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-foreground">
          <Radio className="h-5 w-5 text-[hsl(var(--live-red))]" />
          {"Live " + genre.name + " Streams"}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {"Watch " + genre.activeStreams + " streamers playing " + genre.name + " games right now."}
        </p>
        <div className="card-grid-4-wrapper -mx-4 px-4 lg:-mx-6 lg:px-6">
          <div className="card-grid-4">
          {liveStreams.map((stream, i) => (
            <StreamCard
              key={`${stream.streamerName}-${i}`}
              stream={stream}
              onStreamClick={onStreamClick}
            />
          ))}
          </div>
        </div>
      </section>
    </div>
  )
}
