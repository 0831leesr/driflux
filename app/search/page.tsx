import { Gamepad2 } from "lucide-react"
import { searchGames, searchStreams, getStreamStatsMatchingGameDetails, getHistoricalTrending } from "@/lib/data"
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
      title: `검색: ${query} | Richzem`,
      description: `「${query}」 검색 결과 — Richzem에서 게임과 라이브 방송을 찾아보세요.`,
    }
  }

  return {
    title: "검색 | Richzem",
    description: "Richzem에서 게임, 스트리머, 라이브 콘텐츠를 검색하세요.",
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

  // Fetch games first, then stream stats / streams / yesterday trending in parallel
  const games = await searchGames(query)
  const gameIds = games.map((g) => g.id)
  const [streamStatsMap, streams, yesterdayTrending] = await Promise.all([
    getStreamStatsMatchingGameDetails(games.map((g) => ({ id: g.id, title: g.title, korean_title: g.korean_title, english_title: g.english_title }))),
    searchStreams(query, gameIds),
    getHistoricalTrending("yesterday"),
  ])
  // Convert Map to plain object for client component (Map is not JSON-serializable)
  const streamStatsObj: Record<number, { totalViewers: number; liveStreamCount: number }> = {}
  streamStatsMap.forEach((v, k) => {
    streamStatsObj[k] = v
  })
  const yesterdayTrendingIds = yesterdayTrending.map((g) => g.id)

  return (
    <div className="flex flex-col gap-10 p-4 lg:p-6">
      {/* Section 1: Games (using GameCard - same as Explore/Now Trending) */}
      <SearchGamesSection games={games} streamStats={streamStatsObj} query={query} yesterdayTrendingIds={yesterdayTrendingIds} />

      {/* Section 2: Related Live Streams */}
      <SearchStreamsSection streams={streams} />
    </div>
  )
}
