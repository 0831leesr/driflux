"use client"

import Link from "next/link"
import { ArrowLeft, ExternalLink, Heart, Loader2, Radio, Tag, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { GameRow } from "@/lib/data"
import { getDisplayGameTitle } from "@/lib/utils"
import GameImage from "@/components/ui/game-image"

export type GameHeaderProps = {
  game: GameRow
  headerStreamCount: number
  viewersFormatted: string
  tags: string[]
  isFollowing: boolean
  isPending: boolean
  onBack: () => void
  onFollowClick: () => void
  onVisitStoreClick: () => void
}

export function GameHeader({
  game,
  headerStreamCount,
  viewersFormatted,
  tags,
  isFollowing,
  isPending,
  onBack,
  onFollowClick,
  onVisitStoreClick,
}: GameHeaderProps) {
  return (
    <>
      <div className="px-4 pt-4 lg:px-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로
        </Button>
      </div>

      <div className="relative mx-4 mt-3 overflow-hidden rounded-2xl border border-border lg:mx-6">
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

        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:gap-6 sm:p-6 md:p-7">
          <div className="relative mx-auto h-48 w-32 shrink-0 overflow-hidden rounded-xl border-2 border-border/50 shadow-2xl sm:mx-0 sm:h-56 sm:w-40 md:h-60">
            <GameImage
              src={game.header_image_url ?? game.cover_image_url}
              type="cover"
              alt={getDisplayGameTitle(game)}
              fill
              placeholder="empty"
              className="object-cover"
              sizes="(min-width: 640px) 160px, 128px"
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4">
            <h1 className="text-balance text-center text-2xl font-bold tracking-tight text-foreground sm:text-left sm:text-3xl md:text-4xl">
              {getDisplayGameTitle(game)}
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-3 text-sm sm:justify-start sm:gap-4">
              <span className="flex items-center gap-1.5 text-foreground">
                <Radio className="h-4 w-4 shrink-0 text-[hsl(var(--live-red))]" />
                <span className="font-semibold">{headerStreamCount}</span>
                <span className="text-muted-foreground">라이브 채널</span>
              </span>
              <span className="flex items-center gap-1.5 text-foreground">
                <Users className="h-4 w-4 shrink-0 text-[hsl(var(--neon-purple))]" />
                <span className="font-semibold">{viewersFormatted}</span>
                <span className="text-muted-foreground">시청자</span>
              </span>
              {game.discount_rate != null && game.discount_rate > 0 && (
                <span className="flex items-center gap-1.5">
                  <Tag className="h-4 w-4 shrink-0 text-amber-400" />
                  <Badge className="border-transparent bg-gradient-to-r from-amber-500 to-red-500 px-2 py-0.5 text-xs font-bold text-[hsl(var(--primary-foreground))]">
                    -{game.discount_rate}% 스팀 할인
                  </Badge>
                </span>
              )}
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {tags.map((tag, index) => (
                  <Link
                    key={index}
                    href={`/tags/${encodeURIComponent(tag)}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Badge className="inline-flex cursor-pointer items-center rounded-md border border-[hsl(var(--neon-purple))]/40 bg-[hsl(var(--neon-purple))]/10 px-2.5 py-1 text-xs font-medium text-[hsl(var(--neon-purple))] shadow-sm transition-all duration-200 hover:scale-[1.03] hover:border-[hsl(var(--neon-purple))]/70 hover:bg-[hsl(var(--neon-purple))]/20 hover:shadow-md">
                      #{tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <Button
                onClick={onFollowClick}
                disabled={isPending}
                className={
                  isFollowing
                    ? "bg-[hsl(var(--neon-purple))]/15 text-[hsl(var(--neon-purple))] hover:bg-[hsl(var(--neon-purple))]/25 disabled:opacity-70"
                    : "bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--neon-purple))]/80 disabled:opacity-70"
                }
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Heart className={`mr-2 h-4 w-4 ${isFollowing ? "fill-current" : ""}`} />
                )}
                {isFollowing ? "팔로우 중" : "게임 팔로우"}
              </Button>
              {game.steam_appid != null && (
                <Button
                  variant="outline"
                  className="border-border text-foreground hover:bg-secondary"
                  onClick={onVisitStoreClick}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  스토어 열기
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
