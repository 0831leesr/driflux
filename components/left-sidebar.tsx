"use client"

import { usePathname } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Gamepad2, Tags } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFavoriteGames, useFavoriteTags } from "@/contexts/favorites-context"
import { useEffect, useState } from "react"
import { fetchGamesByIds, type GameRow } from "@/lib/data"
import { getBestGameImage, getDisplayGameTitle } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

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

export function LeftSidebar({ games: _deprecatedGames, embedded = false, isCollapsed = false }: LeftSidebarProps = {}) {
  const pathname = usePathname()
  const { favorites: favoriteGameIds, isInitialized: gamesInitialized } = useFavoriteGames()
  const { favorites: favoriteTags, isInitialized: tagsInitialized } = useFavoriteTags()
  const [games, setGames] = useState<GameRow[]>([])
  const [isLoadingGames, setIsLoadingGames] = useState(true)

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

  // Check if current path matches a game page by ID
  const isGameActive = (gameId: number) => {
    return pathname === `/game/${gameId}`
  }

  // Check if current path matches a tag page
  const isTagActive = (tagName: string) => {
    return pathname === `/tags/${encodeURIComponent(tagName)}`
  }

  const sidebarWidth = embedded ? "w-60" : isCollapsed ? "w-[70px]" : "w-60"

  return (
    <aside
      className={`${embedded ? "flex h-full shrink-0 flex-col border-r border-border bg-card" : "hidden shrink-0 flex-col border-r border-border bg-card lg:flex"} ${sidebarWidth} transition-[width] duration-300 ease-in-out`}
    >
      <ScrollArea className={embedded ? "h-full" : "min-h-0 flex-1"}>
        <div className={`flex flex-col gap-6 transition-all duration-300 ${isCollapsed ? "p-2" : "p-4"}`}>
          {/* My Followed Games */}
          <section>
            <h3
              className={`mb-3 flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground ${
                isCollapsed ? "justify-center" : "gap-2"
              }`}
            >
              <Gamepad2 className="h-3.5 w-3.5 shrink-0" />
              {!isCollapsed && <span>My Followed Games</span>}
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
                          unoptimized={!game.cover_image_url}
                        />
                      </div>
                      {!isCollapsed && (
                        <>
                          <span className="truncate text-sm text-foreground">{getDisplayGameTitle(game)}</span>
                          <span
                            className="ml-auto h-2 w-2 shrink-0 animate-pulse rounded-full bg-[hsl(var(--live-red))]"
                            aria-label="Live"
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
                  {!isCollapsed && "No favorite games yet"}
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
              {!isCollapsed && <span>My Followed Tags</span>}
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
                  {!isCollapsed && "No favorite tags yet"}
                </p>
              )}
            </div>
          </section>
        </div>
      </ScrollArea>
    </aside>
  )
}
