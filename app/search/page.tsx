import { Gamepad2 } from "lucide-react"
import { searchGames, searchStreams, getStreamStatsForGameIds } from "@/lib/data"
import { SearchStreamsSection } from "@/components/search-streams-section"
import { SearchGamesSection } from "@/components/search-games-section"

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata({ searchParams }: PageProps) {
  const params = await searchParams
  const query = params.q

  if (query) {
    return {
      title: `Search: ${query} | Driflux`,
      description: `Search results for "${query}" - Find games and live streams on Driflux.`,
    }
  }

  return {
    title: "Search | Driflux",
    description: "Search for games, streamers, and live content on Driflux.",
  }
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams
  const query = params.q?.trim() ?? ""

  // No query: prompt user to enter search term
  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Gamepad2 className="mb-4 h-16 w-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold text-foreground">검색어를 입력해주세요</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          상단 검색창에서 게임, 스트리머, 태그를 검색할 수 있습니다.
        </p>
      </div>
    )
  }

  // Fetch games first, then stream stats and streams in parallel
  const games = await searchGames(query)
  const gameIds = games.map((g) => g.id)
  const [streamStatsMap, streams] = await Promise.all([
    getStreamStatsForGameIds(gameIds),
    searchStreams(query, gameIds),
  ])
  // Convert Map to plain object for client component (Map is not JSON-serializable)
  const streamStatsObj: Record<number, { totalViewers: number; liveStreamCount: number }> = {}
  streamStatsMap.forEach((v, k) => {
    streamStatsObj[k] = v
  })

  return (
    <div className="flex flex-col gap-10 p-4 lg:p-6">
      {/* Section 1: Games (using GameCard - same as Explore/Now Trending) */}
      <SearchGamesSection games={games} streamStats={streamStatsObj} query={query} />

      {/* Section 2: Related Live Streams */}
      <SearchStreamsSection streams={streams} />
    </div>
  )
}
