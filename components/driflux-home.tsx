import { fetchLiveStreams, fetchTrendingGames, fetchUpcomingEvents } from "@/lib/data"
import { HomeClient } from "@/components/home-client"

export default async function Home() {
  const [liveStreams, trendingGames, upcomingEvents] = await Promise.all([
    fetchLiveStreams(16),
    fetchTrendingGames(),
    fetchUpcomingEvents(),
  ])

  return (
    <HomeClient
      liveStreams={liveStreams}
      trendingGames={trendingGames}
      upcomingEvents={upcomingEvents}
    />
  )
}
