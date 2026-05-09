import type { MetadataRoute } from "next"
import { createClientForCache } from "@/lib/supabase/server"
import { encodeGameUrlSegment } from "@/lib/game-path"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://richzem.xyz"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      changeFrequency: "hourly",
      priority: 1,
    },
  ]

  const supabase = createClientForCache()
  const gameRows: Array<{ id: number; slug: string | null }> = []
  const pageSize = 1000
  let offset = 0

  for (;;) {
    const { data, error } = await supabase
      .from("games")
      .select("id, slug")
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.error("[sitemap] games fetch:", error.message)
      break
    }
    if (!data?.length) break

    for (const row of data) {
      const id = row.id
      const slug = typeof row.slug === "string" ? row.slug.trim() || null : null
      if (typeof id === "number" && id > 0) {
        gameRows.push({ id, slug })
      }
    }

    if (data.length < pageSize) break
    offset += pageSize
  }

  const dynamicEntries: MetadataRoute.Sitemap = [...gameRows]
    .sort((a, b) => a.id - b.id)
    .map(({ id, slug }) => ({
      url: slug
        ? `${BASE_URL}/game/${encodeGameUrlSegment(slug)}`
        : `${BASE_URL}/game/${id}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }))

  return [...staticEntries, ...dynamicEntries]
}
