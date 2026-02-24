import { fetchLiveStreams, fetchTrendingGames, fetchUpcomingEvents, fetchEsportsChannels } from "@/lib/data"
import { HomeClient } from "@/components/home-client"

export default async function Home() {
  const [liveStreams, trendingGames, upcomingEvents, esportsChannels] = await Promise.all([
    fetchLiveStreams(16),
    fetchTrendingGames(),
    fetchUpcomingEvents(),
    fetchEsportsChannels(),
  ])

  return (
    <HomeClient
      liveStreams={liveStreams}
      trendingGames={trendingGames}
      upcomingEvents={upcomingEvents}
      esportsChannels={esportsChannels}
    />
  )
}
