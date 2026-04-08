"use client"

import Link from "next/link"
import { ArrowLeft, ExternalLink, Heart, Loader2, Radio, User, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { GameRow } from "@/lib/data"
import type { GameDetailTopStreamer } from "@/lib/types"
import { getDisplayGameTitle } from "@/lib/utils"
import GameImage from "@/components/ui/game-image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { GameDetailHeaderBadgesRow } from "@/components/game/game-detail-header-badges"
import { buildFeatureTags } from "@/lib/feature-tags"
import { newReleaseDPlusForBadge } from "@/lib/release-date"

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
  /** 어제 트렌드 집계에 포함 */
  isYesterdayTrending?: boolean
  /** 오늘 daily_game_stats 급상승 */
  isRising?: boolean
  /** TOP3 슬롯(이름 없으면 "---"), 항상 3개 권장 */
  topStreamers?: GameDetailTopStreamer[]
}

/** 치지직 채널/라이브 진입 (프로젝트 공통 패턴과 동일) */
const chzzkChannelHref = (channelId: string) =>
  `https://chzzk.naver.com/live/${encodeURIComponent(channelId)}`

const TOP_PLACEHOLDER = "---"

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
  isYesterdayTrending = false,
  isRising = false,
  topStreamers = [],
}: GameHeaderProps) {
  const topSlots: GameDetailTopStreamer[] =
    topStreamers.length >= 3
      ? topStreamers.slice(0, 3)
      : [
          ...topStreamers,
          ...Array.from({ length: Math.max(0, 3 - topStreamers.length) }, () => ({
            displayName: TOP_PLACEHOLDER,
            channelId: null as string | null,
            profileImageUrl: null as string | null,
          })),
        ]

  const headerFeatureTags = buildFeatureTags({
    newReleaseDPlus: newReleaseDPlusForBadge(game.release_date ?? null),
    isTrending: isYesterdayTrending,
    isRising,
  })

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

        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:gap-5 sm:p-6 md:gap-6 md:p-7">
          <div className="relative mx-auto h-48 w-32 shrink-0 overflow-hidden rounded-xl border-2 border-border/50 shadow-2xl sm:mx-0 sm:h-56 sm:w-40 md:h-60 sm:self-end">
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
            <GameDetailHeaderBadgesRow
              featureTags={headerFeatureTags}
              discountRate={game.discount_rate}
            />

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

          <div className="flex w-full shrink-0 flex-col gap-2.5 border-t border-border/50 pt-4 sm:w-auto sm:min-w-[10.5rem] sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 md:min-w-[11.5rem]">
            <p className="text-center text-xs font-medium text-muted-foreground sm:text-left">
              최근 플레이 스트리머
            </p>
            <ul className="flex flex-col gap-2" aria-label="최근 플레이 스트리머 TOP 3">
              {topSlots.map((s, idx) => {
                const isPlaceholder = s.displayName === TOP_PLACEHOLDER
                const href =
                  !isPlaceholder && s.channelId?.trim()
                    ? chzzkChannelHref(s.channelId.trim())
                    : null

                const rowClass =
                  "flex min-h-10 w-full items-center gap-2.5 rounded-md border border-border bg-background/40 px-3 py-2 text-left text-sm transition-colors"

                const avatarUrl = s.profileImageUrl?.trim() || null
                const avatar = (
                  <Avatar className="h-8 w-8 shrink-0 border border-border/60" aria-hidden={true}>
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt="" className="object-cover" />
                    ) : null}
                    <AvatarFallback
                      className={
                        isPlaceholder
                          ? "bg-muted/80 text-xs text-muted-foreground"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {isPlaceholder ? "—" : <User className="h-4 w-4" aria-hidden />}
                    </AvatarFallback>
                  </Avatar>
                )

                const label = (
                  <span
                    className={`min-w-0 flex-1 truncate font-medium ${
                      isPlaceholder ? "text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {s.displayName}
                  </span>
                )

                const rowInner = (
                  <>
                    {avatar}
                    {label}
                  </>
                )

                return (
                  <li key={`top-streamer-${idx}`}>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${rowClass} cursor-pointer hover:border-[hsl(var(--neon-purple))]/50 hover:bg-accent/40 hover:text-[hsl(var(--neon-purple))]`}
                      >
                        {rowInner}
                      </a>
                    ) : (
                      <div
                        className={`${rowClass} cursor-default ${
                          isPlaceholder ? "opacity-90" : ""
                        }`}
                      >
                        {rowInner}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
