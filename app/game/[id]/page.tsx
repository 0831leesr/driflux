import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { fetchGameById, fetchStreamsByGameId } from "@/lib/data"
import { getGameImageSrc } from "@/lib/utils"
import { GameDetailsPage } from "@/components/game-details-page"

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const gameId = parseInt(id, 10)

  if (isNaN(gameId) || gameId <= 0) {
    return {
      title: "Game Not Found",
    }
  }

  const game = await fetchGameById(gameId)

  if (!game) {
    return {
      title: "Game Not Found",
    }
  }

  const title = `${game.title} - Live on Driflux`
  const description = `Watch live streams of ${game.title}. Find the best streamers and gameplay content.`
  const ogImage = getGameImageSrc(game.header_image_url, game.cover_image_url)

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: game.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function GamePage({ params }: PageProps) {
  const { id } = await params
  const gameId = parseInt(id, 10)

  // Validate ID
  if (isNaN(gameId) || gameId <= 0) {
    notFound()
  }

  // Fetch game data and streams
  const [game, streams] = await Promise.all([
    fetchGameById(gameId),
    fetchStreamsByGameId(gameId),
  ])

  // If game not found, show 404
  if (!game) {
    notFound()
  }

  return <GameDetailsPage game={game} streams={streams} />
}
