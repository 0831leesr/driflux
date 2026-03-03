import {
  fetchLiveStreams,
  fetchTrendingGames,
  fetchGamesWithDrops,
  fetchHiddenGemsGames,
  fetchNewReleasesGames,
  fetchUpcomingEvents,
  fetchEsportsChannels,
} from "@/lib/data"
import { HomeClient } from "@/components/home-client"

export default async function Home() {
  const [
    liveStreams,
    trendingGames,
    gamesWithDrops,
    hiddenGemsGames,
    newReleasesGames,
    upcomingEvents,
    esportsChannels,
  ] = await Promise.all([
    fetchLiveStreams(16),
    fetchTrendingGames(),
    fetchGamesWithDrops(),
    fetchHiddenGemsGames(),
    fetchNewReleasesGames(),
    fetchUpcomingEvents(),
    fetchEsportsChannels(),
  ])

  return (
    <HomeClient
      liveStreams={liveStreams}
      trendingGames={trendingGames}
      gamesWithDrops={gamesWithDrops}
      hiddenGemsGames={hiddenGemsGames}
      newReleasesGames={newReleasesGames}
      upcomingEvents={upcomingEvents}
      esportsChannels={esportsChannels}
    />
  )
}
