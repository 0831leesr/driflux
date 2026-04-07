import type { MetadataRoute } from "next"
import { createClientForCache } from "@/lib/supabase/server"

const BASE_URL = "https://richzem.xyz"

const GAMES_PAGE_SIZE = 1000

async function fetchDistinctGameIds(): Promise<number[]> {
  const supabase = createClientForCache()
  const ids: number[] = []

  for (let from = 0; ; from += GAMES_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("games")
      .select("id")
      .order("id", { ascending: true })
      .range(from, from + GAMES_PAGE_SIZE - 1)

    if (error) {
      console.error("[sitemap] games id fetch:", error.message)
      break
    }
    if (!data?.length) break

    for (const row of data) {
      const id = Number((row as { id: number }).id)
      if (Number.isFinite(id) && id > 0) ids.push(id)
    }

    if (data.length < GAMES_PAGE_SIZE) break
  }

  return ids
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
  ]

  const gameIds = await fetchDistinctGameIds()
  const gameEntries: MetadataRoute.Sitemap = gameIds.map((gameId) => ({
    url: `${BASE_URL}/game/${gameId}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }))

  return [...staticEntries, ...gameEntries]
}
