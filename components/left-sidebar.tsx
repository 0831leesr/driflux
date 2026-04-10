"use client"

import { usePathname } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Gamepad2, Tags, UserCircle2, CalendarDays, Flame, TrendingUp } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFavoriteGames, useFavoriteTags, useFavoriteStreamers, useFavoritesSession } from "@/contexts/favorites-context"
import { useEffect, useState } from "react"
import { fetchGamesByIds, type GameRow } from "@/lib/data"
import { getBestGameImage, getDisplayGameTitle, formatViewerCountShort } from "@/lib/utils"
import type { SidebarSpotlightGame } from "@/lib/sidebar-spotlight"
import { Skeleton } from "@/components/ui/skeleton"
import { useFollowedEvents } from "@/contexts/followed-events-context"

interface LeftSidebarProps {
  games?: Array<{
    id: number
    name: string
    cover: string | null
  }>
  /** When true, renders without hidden lg:block (for use inside mobile Sheet) */
  embedded?: boolean
  /** When true, sidebar is collapsed (icon-only mode). Controlled by parent. */
  isCollapsed?: boolean
  /** 루트 레이아웃에서 시드 — `/api/sidebar-spotlight` 중복 호출 방지 */
  initialSpotlight: { trending: SidebarSpotlightGame[]; rising: SidebarSpotlightGame[] }
}

// Tag icon mapping
const TAG_ICONS: Record<string, string> = {
  "Horror": "💀",
  "Co-op": "🤝",
  "Soulslike": "⚔️",
  "Indie": "🎮",
  "RPG": "🛡️",
  "Open World": "🌍",
  "FPS": "🎯",
  "Roguelike": "🎲",
  "Action": "⚡",
  "Strategy": "🧠",
  "Simulation": "🎯",
  "Adventure": "🗺️",
}

function getTagIcon(tagName: string): string {
  return TAG_ICONS[tagName] || "🎮"
}

function getDDayLabel(eventDate: Date, today: Date): { text: string; color: string } {
  const todayMidnight = new Date(today)
  todayMidnight.setHours(0, 0, 0, 0)
  const eventMidnight = new Date(eventDate)
  eventMidnight.setHours(0, 0, 0, 0)
  const diff = Math.ceil((eventMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return { text: "D-Day", color: "text-[hsl(var(--live-red))]" }
  if (diff <= 3) return { text: `D-${diff}`, color: "text-amber-400" }
  return { text: `D-${diff}`, color: "text-muted-foreground" }
}

export function LeftSidebar({
  games: _deprecatedGames,
  embedded = false,
  isCollapsed = false,
  initialSpotlight,
}: LeftSidebarProps) {
  const pathname = usePathname()
  const { isAuthenticated, sessionResolved } = useFavoritesSession()
  const showFollowSidebar = sessionResolved && isAuthenticated
  const { favorites: favoriteGameIds, isInitialized: gamesInitialized } = useFavoriteGames()
  const { favorites: favoriteTags, isInitialized: tagsInitialized } = useFavoriteTags()
  const { favorites: favoriteStreamers, isInitialized: streamersInitialized } = useFavoriteStreamers()
  const { followedEvents } = useFollowedEvents()
  const [games, setGames] = useState<GameRow[]>([])
  const [isLoadingGames, setIsLoadingGames] = useState(true)
  const [streamerStatuses, setStreamerStatuses] = useState<Record<string, { isLive: boolean; gameTitle?: string }>>({})
  const [isLoadingStreamers, setIsLoadingStreamers] = useState(false)
  const [spotlight] = useState(() => ({
    trending: Array.isArray(initialSpotlight.trending) ? initialSpotlight.trending : [],
    rising: Array.isArray(initialSpotlight.rising) ? initialSpotlight.rising : [],
  }))
  const spotlightLoading = false

  // Fetch games data when favorite IDs change
  useEffect(() => {
    if (!gamesInitialized) return
    
    const loadGames = async () => {
      // Only show loading state on initial load (when games array is empty)
      // This prevents the flickering when adding/removing favorites
      const isInitialLoad = games.length === 0 && favoriteGameIds.length > 0
      
      if (isInitialLoad) {
        setIsLoadingGames(true)
      }
      
      try {
        const gamesData = await fetchGamesByIds(favoriteGameIds)
        setGames(gamesData)
      } catch (error) {
        console.error("Error loading favorite games:", error)
      } finally {
        // Always set loading to false when done
        setIsLoadingGames(false)
      }
    }
    
    loadGames()
  }, [favoriteGameIds, gamesInitialized])

  // Fetch streamer live status when followed streamers change
  useEffect(() => {
    if (!streamersInitialized || favoriteStreamers.length === 0) {
      setStreamerStatuses({})
      return
    }

    const channelIds = favoriteStreamers.map((s) => s.channelId)

    const loadStatuses = async () => {
      setIsLoadingStreamers(true)
      try {
        const res = await fetch("/api/streamers/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelIds }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? "Failed to fetch")
        const data = (json.data ?? []) as Array<{
          chzzk_channel_id: string
          is_live: boolean
          category?: string
        }>
        const map: Record<string, { isLive: boolean; gameTitle?: string }> = {}
        for (const item of data) {
          map[item.chzzk_channel_id] = {
            isLive: item.is_live,
            gameTitle: item.category,
          }
        }
        setStreamerStatuses(map)
      } catch (error) {
        console.error("Error loading streamer statuses:", error)
        setStreamerStatuses({})
      } finally {
        setIsLoadingStreamers(false)
      }
    }

    loadStatuses()
  }, [favoriteStreamers, streamersInitialized])

  // Check if current path matches a game page by ID
  const isGameActive = (gameId: number) => {
    return pathname === `/game/${gameId}`
  }

  // Check if current path matches a tag page
  const isTagActive = (tagName: string) => {
    return pathname === `/tags/${encodeURIComponent(tagName)}`
  }

  const sidebarWidth = embedded ? "w-60" : isCollapsed ? "w-[70px]" : "w-60"

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingFollowedEvents = followedEvents
    .map((ev) => {
      const date = new Date(ev.date)
      const endDate = ev.endDate ? new Date(ev.endDate) : null
      const effectiveEnd = endDate ?? date
      effectiveEnd.setHours(0, 0, 0, 0)
      return { ...ev, dateObj: date, endDateObj: endDate, effectiveEnd }
    })
    .filter((ev) => ev.effectiveEnd >= today)
    .sort((a, b) => a.effectiveEnd.getTime() - b.effectiveEnd.getTime())

  return (
    <aside
      className={`${embedded ? "flex h-full shrink-0 flex-col border-r border-border bg-card" : "hidden shrink-0 flex-col border-r border-border bg-card lg:flex"} ${sidebarWidth} transition-[width] duration-300 ease-in-out`}
    >
      <ScrollArea className={embedded ? "h-full" : "min-h-0 flex-1"}>
        <div
          className={`flex min-h-full flex-col gap-6 transition-all duration-300 ${isCollapsed ? "p-2" : "p-4"}`}
        >
          {showFollowSidebar && (
            <>
          {/* 팔로우 일정 */}
          {(upcomingFollowedEvents.length > 0 || !isCollapsed) && (
            <section>
              <h3
                className={`mb-3 flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground ${
                  isCollapsed ? "justify-center" : "gap-2"
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                {!isCollapsed && <span>팔로우 일정</span>}
              </h3>
              <div className="flex flex-col gap-1 transition-opacity duration-200">
                {upcomingFollowedEvents.length === 0 ? (
                  <p className={`py-2 text-center text-xs text-muted-foreground ${isCollapsed ? "hidden" : ""}`}>
                    팔로우한 일정이 없습니다
                  </p>
                ) : (
                  upcomingFollowedEvents.map((ev) => {
                    const { text: ddayText, color: ddayColor } = getDDayLabel(ev.effectiveEnd, today)
                    return (
                      <div
                        key={ev.id}
                        title={isCollapsed ? `${ev.title} (${ddayText})` : undefined}
                        className={`flex items-center rounded-md py-1.5 transition-all duration-200 animate-in fade-in ${
                          isCollapsed ? "justify-center px-0" : "gap-2 px-2"
                        }`}
                      >
                        {isCollapsed ? (
                          <span className={`text-[10px] font-bold ${ddayColor}`}>
                            {ddayText === "D-Day" ? "D" : ddayText.replace("D-", "-")}
                          </span>
                        ) : (
                          <>
                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-medium text-foreground">
                                {ev.title}
                              </span>
                              {ev.subtitle && (
                                <span className="block truncate text-[10px] text-muted-foreground">
                                  {ev.subtitle}
                                </span>
                              )}
                            </div>
                            <span className={`shrink-0 text-[10px] font-bold tabular-nums ${ddayColor}`}>
                              {ddayText}
                            </span>
                          </>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </section>
          )}
          <div className={`h-px bg-border ${upcomingFollowedEvents.length === 0 && isCollapsed ? "hidden" : ""}`} />

          {/* My Followed Games */}
          <section>
            <h3
              className={`mb-3 flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground ${
                isCollapsed ? "justify-center" : "gap-2"
              }`}
            >
              <Gamepad2 className="h-3.5 w-3.5 shrink-0" />
              {!isCollapsed && <span>팔로우한 게임</span>}
            </h3>
            <div className="flex flex-col gap-0.5 transition-opacity duration-200">
              {isLoadingGames ? (
                // Loading skeletons (only shown on initial load)
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2.5 py-1.5 ${isCollapsed ? "justify-center px-0" : "px-2"}`}
                  >
                    <Skeleton className="h-8 w-6 shrink-0 rounded-sm" />
                    {!isCollapsed && <Skeleton className="h-4 flex-1" />}
                  </div>
                ))
              ) : games.length > 0 ? (
                games.map((game) => {
                  const href = `/game/${game.id}`
                  const isActive = isGameActive(game.id)

                  return (
                    <Link
                      key={game.id}
                      href={href}
                      title={isCollapsed ? getDisplayGameTitle(game) : undefined}
                      className={`flex items-center rounded-md py-1.5 text-left transition-all duration-200 animate-in fade-in ${
                        isCollapsed ? "justify-center px-0" : "gap-2.5 px-2"
                      } ${
                        isActive
                          ? "bg-[hsl(var(--neon-purple))]/15 text-foreground"
                          : "hover:bg-secondary"
                      }`}
                    >
                      <div className="relative h-8 w-6 shrink-0 overflow-hidden rounded-sm">
                        <Image
                          src={getBestGameImage(game.header_image_url, game.cover_image_url, "header")}
                          alt={getDisplayGameTitle(game)}
                          fill
                          placeholder="empty"
                          className="object-cover"
                          sizes="24px"
                          unoptimized
                        />
                      </div>
                      {!isCollapsed && (
                        <>
                          <span className="truncate text-sm text-foreground">{getDisplayGameTitle(game)}</span>
                          <span
                            className="ml-auto h-2 w-2 shrink-0 animate-pulse rounded-full bg-[hsl(var(--live-red))]"
                            aria-label="라이브"
                          />
                        </>
                      )}
                    </Link>
                  )
                })
              ) : (
                <p
                  className={`py-4 text-center text-xs text-muted-foreground ${isCollapsed ? "px-0" : "px-2"}`}
                >
                  {!isCollapsed && "팔로우한 게임이 없습니다"}
                </p>
              )}
            </div>
          </section>

          {/* My Followed Tags */}
          <section>
            <h3
              className={`mb-3 flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground ${
                isCollapsed ? "justify-center" : "gap-2"
              }`}
            >
              <Tags className="h-3.5 w-3.5 shrink-0" />
              {!isCollapsed && <span>팔로우한 태그</span>}
            </h3>
            <div className="flex flex-col gap-0.5 transition-opacity duration-200">
              {!tagsInitialized ? (
                // Loading skeletons (only shown on initial load)
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2.5 py-1.5 ${isCollapsed ? "justify-center px-0" : "px-2"}`}
                  >
                    <Skeleton className="h-6 w-6 shrink-0 rounded-sm" />
                    {!isCollapsed && <Skeleton className="h-4 flex-1" />}
                  </div>
                ))
              ) : favoriteTags.length > 0 ? (
                favoriteTags.map((tagName) => {
                  const isActive = isTagActive(tagName)

                  return (
                    <Link
                      key={tagName}
                      href={`/tags/${encodeURIComponent(tagName)}`}
                      title={isCollapsed ? tagName : undefined}
                      className={`flex items-center rounded-md py-1.5 text-left transition-all duration-200 animate-in fade-in ${
                        isCollapsed ? "justify-center px-0" : "gap-2.5 px-2"
                      } ${
                        isActive
                          ? "bg-[hsl(var(--neon-purple))]/15 text-foreground"
                          : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-secondary text-xs">
                        {getTagIcon(tagName)}
                      </span>
                      {!isCollapsed && (
                        <>
                          <span className="truncate text-sm">{tagName}</span>
                          {isActive && (
                            <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--neon-purple))]" />
                          )}
                        </>
                      )}
                    </Link>
                  )
                })
              ) : (
                <p
                  className={`py-4 text-center text-xs text-muted-foreground ${isCollapsed ? "px-0" : "px-2"}`}
                >
                  {!isCollapsed && "팔로우한 태그가 없습니다"}
                </p>
              )}
            </div>
          </section>

          {/* My Followed Streamers */}
          <section>
            <h3
              className={`mb-3 flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground ${
                isCollapsed ? "justify-center" : "gap-2"
              }`}
            >
              <UserCircle2 className="h-3.5 w-3.5 shrink-0" />
              {!isCollapsed && <span>팔로우한 스트리머</span>}
            </h3>
            <div className="flex flex-col gap-0.5 transition-opacity duration-200">
              {!streamersInitialized ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2.5 py-1.5 ${isCollapsed ? "justify-center px-0" : "px-2"}`}
                  >
                    <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
                    {!isCollapsed && <Skeleton className="h-4 flex-1" />}
                  </div>
                ))
              ) : favoriteStreamers.length > 0 ? (
                favoriteStreamers.map((streamer) => {
                  const status = streamerStatuses[streamer.channelId]
                  const isLive = status?.isLive ?? false
                  const gameTitle = status?.gameTitle
                  const chzzkUrl = `https://chzzk.naver.com/live/${streamer.channelId}`

                  return (
                    <a
                      key={streamer.channelId}
                      href={chzzkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={isCollapsed ? streamer.streamerName : undefined}
                      className={`flex items-center rounded-md py-1.5 text-left transition-all duration-200 animate-in fade-in ${
                        isCollapsed ? "justify-center px-0" : "gap-2.5 px-2"
                      } text-foreground hover:bg-secondary`}
                    >
                      <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-secondary">
                        {streamer.channelImageUrl ? (
                          <Image
                            src={streamer.channelImageUrl}
                            alt={streamer.streamerName}
                            fill
                            placeholder="empty"
                            className="object-cover"
                            sizes="24px"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs">
                            <UserCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      {!isCollapsed && (
                        <>
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{streamer.streamerName}</span>
                            <span className="block truncate text-[10px] text-muted-foreground">
                              {isLoadingStreamers ? "..." : isLive ? gameTitle ?? "라이브" : "오프라인"}
                            </span>
                          </div>
                          {isLive && (
                            <span
                              className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[hsl(var(--live-red))]"
                              aria-label="라이브"
                            />
                          )}
                        </>
                      )}
                    </a>
                  )
                })
              ) : (
                <p
                  className={`py-4 text-center text-xs text-muted-foreground ${isCollapsed ? "px-0" : "px-2"}`}
                >
                  {!isCollapsed && "팔로우한 스트리머가 없습니다"}
                </p>
              )}
            </div>
          </section>
            </>
          )}
          {showFollowSidebar && <div className="min-h-0 flex-1" aria-hidden />}
          <div
            className={
              showFollowSidebar ? "flex flex-col gap-6 border-t border-border pt-4" : "flex flex-col gap-6"
            }
          >
            <section>
              <h3
                className={`mb-3 flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground ${
                  isCollapsed ? "justify-center" : "gap-2"
                }`}
              >
                <Flame className="h-3.5 w-3.5 shrink-0 text-orange-400" />
                {!isCollapsed && <span>실시간 트렌딩 게임</span>}
              </h3>
              <div className="flex flex-col gap-0.5 transition-opacity duration-200">
                {spotlightLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={`trend-skel-${i}`}
                      className={`flex items-center gap-2.5 py-1.5 ${isCollapsed ? "justify-center px-0" : "px-2"}`}
                    >
                      <Skeleton className="h-8 w-6 shrink-0 rounded-sm" />
                      {!isCollapsed && <Skeleton className="h-4 flex-1" />}
                    </div>
                  ))
                ) : (spotlight?.trending.length ?? 0) > 0 ? (
                  spotlight!.trending.map((game) => {
                    const href = `/game/${game.id}`
                    const isActive = isGameActive(game.id)
                    const meta = `${formatViewerCountShort(game.totalViewers)} 시청`
                    return (
                      <Link
                        key={`trend-${game.id}`}
                        href={href}
                        title={isCollapsed ? `${game.title} · ${meta}` : undefined}
                        className={`flex items-center rounded-md py-1.5 text-left transition-all duration-200 animate-in fade-in ${
                          isCollapsed ? "justify-center px-0" : "gap-2.5 px-2"
                        } ${
                          isActive
                            ? "bg-[hsl(var(--neon-purple))]/15 text-foreground"
                            : "text-foreground hover:bg-secondary"
                        }`}
                      >
                        <div className="relative h-8 w-6 shrink-0 overflow-hidden rounded-sm">
                          <Image
                            src={getBestGameImage(game.header_image_url, game.cover_image_url, "header")}
                            alt={game.title}
                            fill
                            placeholder="empty"
                            className="object-cover"
                            sizes="24px"
                            unoptimized
                          />
                        </div>
                        {!isCollapsed && (
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{game.title}</span>
                            <span className="block truncate text-[10px] text-muted-foreground">{meta}</span>
                          </div>
                        )}
                      </Link>
                    )
                  })
                ) : (
                  <p
                    className={`py-2 text-center text-xs text-muted-foreground ${isCollapsed ? "hidden" : "px-2"}`}
                  >
                    실시간 데이터가 없습니다
                  </p>
                )}
              </div>
            </section>
            <section>
              <h3
                className={`mb-3 flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground ${
                  isCollapsed ? "justify-center" : "gap-2"
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                {!isCollapsed && <span>인기 급상승 게임</span>}
              </h3>
              <div className="flex flex-col gap-0.5 transition-opacity duration-200">
                {spotlightLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={`rise-skel-${i}`}
                      className={`flex items-center gap-2.5 py-1.5 ${isCollapsed ? "justify-center px-0" : "px-2"}`}
                    >
                      <Skeleton className="h-8 w-6 shrink-0 rounded-sm" />
                      {!isCollapsed && <Skeleton className="h-4 flex-1" />}
                    </div>
                  ))
                ) : (spotlight?.rising.length ?? 0) > 0 ? (
                  spotlight!.rising.map((game) => {
                    const href = `/game/${game.id}`
                    const isActive = isGameActive(game.id)
                    const meta = `${formatViewerCountShort(game.totalViewers)} 시청`
                    return (
                      <Link
                        key={`rise-${game.id}`}
                        href={href}
                        title={isCollapsed ? `${game.title} · ${meta}` : undefined}
                        className={`flex items-center rounded-md py-1.5 text-left transition-all duration-200 animate-in fade-in ${
                          isCollapsed ? "justify-center px-0" : "gap-2.5 px-2"
                        } ${
                          isActive
                            ? "bg-[hsl(var(--neon-purple))]/15 text-foreground"
                            : "text-foreground hover:bg-secondary"
                        }`}
                      >
                        <div className="relative h-8 w-6 shrink-0 overflow-hidden rounded-sm">
                          <Image
                            src={getBestGameImage(game.header_image_url, game.cover_image_url, "header")}
                            alt={game.title}
                            fill
                            placeholder="empty"
                            className="object-cover"
                            sizes="24px"
                            unoptimized
                          />
                        </div>
                        {!isCollapsed && (
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{game.title}</span>
                            <span className="block truncate text-[10px] text-muted-foreground">{meta}</span>
                          </div>
                        )}
                      </Link>
                    )
                  })
                ) : (
                  <p
                    className={`py-2 text-center text-xs text-muted-foreground ${isCollapsed ? "hidden" : "px-2"}`}
                  >
                    급상승 게임이 없습니다
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </ScrollArea>
    </aside>
  )
}
