import { fetchLiveStreams, fetchSaleGames, fetchUpcomingEvents } from "@/lib/data"
import { HomeClient } from "@/components/home-client"

export default async function Home() {
  const [liveStreams, saleGames, upcomingEvents] = await Promise.all([
    fetchLiveStreams(),
    fetchSaleGames(),
    fetchUpcomingEvents(),
  ])

  return (
    <HomeClient
      liveStreams={liveStreams}
      saleGames={saleGames}
      upcomingEvents={upcomingEvents}
    />
  )
}
