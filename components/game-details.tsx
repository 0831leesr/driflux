"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Heart,
  ExternalLink,
  Radio,
  Tag,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StreamCard, type StreamData } from "@/components/stream-card"
import type { GameRow } from "@/lib/data"
import { getDisplayGameTitle } from "@/lib/utils"
import GameImage from "@/components/ui/game-image"
import { useFavoriteGames } from "@/contexts/favorites-context"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/* ── Main Game Details Component ── */
export function GameDetailsClient({
  game,
  streams,
  onBack,
  onStreamClick,
}: {
  game: GameRow
  streams: StreamData[]
  onBack: () => void
  onStreamClick?: (stream: StreamData) => void
}) {
  const { isFavorite, toggleFavorite } = useFavoriteGames()
  const isFollowing = isFavorite(game.id)
  const [steamModalOpen, setSteamModalOpen] = useState(false)

  const liveStreams = streams
  
  // Calculate total viewers
  const totalViewers = liveStreams.reduce((sum, stream) => sum + (stream.viewers || 0), 0)
  const viewersFormatted = totalViewers >= 1000 
    ? `${(totalViewers / 1000).toFixed(1)}K` 
    : String(totalViewers)
  
  // Use top_tags from game object (top 5 tags)
  const tags = game.top_tags && Array.isArray(game.top_tags) 
    ? game.top_tags.slice(0, 5) 
    : []
  
  const handleFollowClick = () => {
    toggleFavorite(game.id)
  }

  const handleVisitStoreClick = () => {
    setSteamModalOpen(true)
  }

  const handleContinueToSteam = () => {
    if (game.steam_appid != null) {
      window.open(`https://store.steampowered.com/app/${game.steam_appid}`, "_blank")
    }
    setSteamModalOpen(false)
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

      {/* Hero Section */}
      <div className="relative mx-4 mt-3 overflow-hidden rounded-2xl border border-border lg:mx-6">
        {/* Blurred Background */}
        <div className="absolute inset-0">
          <GameImage
            src={game.background_image_url}
            type="background"
            alt=""
            fill
            placeholder="empty"
            className="object-cover"
            sizes="100vw"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card/90 via-card/70 to-card/40" />
        </div>

        {/* Hero Content */}
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:gap-8 sm:p-8">
          {/* Cover Art */}
          <div className="relative h-52 w-36 shrink-0 overflow-hidden rounded-xl border-2 border-border/50 shadow-2xl sm:h-64 sm:w-44">
            <GameImage
              src={game.header_image_url ?? game.cover_image_url}
              type="cover"
              alt={getDisplayGameTitle(game)}
              fill
              placeholder="empty"
              className="object-cover"
              sizes="(min-width: 640px) 176px, 144px"
            />
          </div>

          {/* Game Info */}
          <div className="flex flex-1 flex-col gap-4">
            <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {getDisplayGameTitle(game)}
            </h1>

            {/* Stats Row */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-foreground">
                <Radio className="h-4 w-4 text-[hsl(var(--live-red))]" />
                <span className="font-semibold">{liveStreams.length}</span>
                <span className="text-muted-foreground">Live Channels</span>
              </span>
              <span className="flex items-center gap-1.5 text-foreground">
                <Users className="h-4 w-4 text-[hsl(var(--neon-purple))]" />
                <span className="font-semibold">{viewersFormatted}</span>
                <span className="text-muted-foreground">Viewers</span>
              </span>
              {game.discount_rate && game.discount_rate > 0 && (
                <span className="flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-amber-400" />
                  <Badge className="border-transparent bg-gradient-to-r from-amber-500 to-red-500 px-2 py-0.5 text-xs font-bold text-[hsl(var(--primary-foreground))]">
                    -{game.discount_rate}% Steam Sale
                  </Badge>
                </span>
              )}
            </div>

            {/* Tags Row */}
            {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {tags.map((tag, index) => (
                  <Link
                    key={index}
                    href={`/tags/${encodeURIComponent(tag)}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Badge className="inline-flex items-center rounded-md border border-[hsl(var(--neon-purple))]/40 bg-[hsl(var(--neon-purple))]/10 px-2.5 py-1 text-xs font-medium text-[hsl(var(--neon-purple))] shadow-sm transition-all duration-200 hover:scale-[1.03] hover:border-[hsl(var(--neon-purple))]/70 hover:bg-[hsl(var(--neon-purple))]/20 hover:shadow-md cursor-pointer">
                      #{tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleFollowClick}
                className={
                  isFollowing
                    ? "bg-[hsl(var(--neon-purple))]/15 text-[hsl(var(--neon-purple))] hover:bg-[hsl(var(--neon-purple))]/25"
                    : "bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--neon-purple))]/80"
                }
              >
                <Heart
                  className={`mr-2 h-4 w-4 ${isFollowing ? "fill-current" : ""}`}
                />
                {isFollowing ? "Following" : "Follow Game"}
              </Button>
              {game.steam_appid != null && (
                <Button
                  variant="outline"
                  className="border-border text-foreground hover:bg-secondary"
                  onClick={handleVisitStoreClick}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Visit Store
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Steam Store Modal */}
      <AlertDialog open={steamModalOpen} onOpenChange={setSteamModalOpen}>
        <AlertDialogContent className="border-border bg-card text-foreground">
          <AlertDialogHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--neon-purple))]/15">
              <ExternalLink className="h-6 w-6 text-[hsl(var(--neon-purple))]" />
            </div>
            <AlertDialogTitle className="text-foreground">
              Visit Steam Store?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              You are being redirected to the Steam store. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-secondary text-foreground hover:bg-secondary/80 hover:text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--neon-purple))]/80"
              onClick={handleContinueToSteam}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Live Streams */}
      <div className="flex flex-col gap-6 p-4 lg:p-6">
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
      </div>
    </div>
  )
}

