import type { MetadataRoute } from "next"
import { createClientForCache } from "@/lib/supabase/server"

const BASE_URL = "https://richzem.xyz"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      changeFrequency: "hourly",
      priority: 1,
    },
  ]

  const supabase = createClientForCache()
  const gameIds = new Set<number>()
  const pageSize = 1000
  let offset = 0

  for (;;) {
    const { data, error } = await supabase
      .from("games")
      .select("id")
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.error("[sitemap] games fetch:", error.message)
      break
    }
    if (!data?.length) break

    for (const row of data) {
      const id = row.id
      if (typeof id === "number" && id > 0) gameIds.add(id)
    }

    if (data.length < pageSize) break
    offset += pageSize
  }

  const dynamicEntries: MetadataRoute.Sitemap = [...gameIds]
    .sort((a, b) => a - b)
    .map((gameId) => ({
      url: `${BASE_URL}/game/${gameId}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }))

  return [...staticEntries, ...dynamicEntries]
}
