/**
 * IGDB (Twitch) API Integration
 *
 * Used to fetch game metadata (especially cover images) for games
 * not available on Steam (e.g., LoL, Valorant).
 *
 * API Docs: https://api-docs.igdb.com/
 * Rate limit: ~4 requests/second
 */

const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token"
const IGDB_GAMES_URL = "https://api.igdb.com/v4/games"

export interface IGDBGameResult {
  title: string
  image_url: string
  backdrop_url: string | null
  release_date: number | null
}

/**
 * IGDB는 URL을 `//images.igdb.com/...` 형태로 반환함. https: 프로토콜 강제 추가.
 */
function ensureHttpsUrl(url: string): string {
  if (!url?.trim()) return url
  const trimmed = url.trim()
  if (trimmed.startsWith("//")) return `https:${trimmed}`
  if (!trimmed.startsWith("http")) return `https://${trimmed}`
  return trimmed
}

/* ── Token cache (reuse within same process) ── */
let cachedToken: string | null = null

/**
 * Get IGDB Access Token via Twitch OAuth2 Client Credentials Flow
 */
export async function getIGDBToken(): Promise<string> {
  if (cachedToken) {
    return cachedToken
  }

  const clientId = process.env.TWITCH_CLIENT_ID
  const clientSecret = process.env.TWITCH_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET are required")
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  })

  const res = await fetch(`${TWITCH_TOKEN_URL}?${params.toString()}`, {
    method: "POST",
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`IGDB token request failed: ${res.status} ${text}`)
  }

  const data = (await res.json()) as { access_token: string; expires_in?: number }
  cachedToken = data.access_token
  return cachedToken
}

/**
 * Search for a game on IGDB and return metadata with high-resolution cover URL.
 *
 * @param gameName - Game name to search for
 * @returns { title, image_url, release_date } or null if not found
 */
export async function searchIGDBGame(gameName: string): Promise<IGDBGameResult | null> {
  if (!gameName?.trim()) {
    return null
  }

  const token = await getIGDBToken()
  const clientId = process.env.TWITCH_CLIENT_ID

  if (!clientId) {
    throw new Error("TWITCH_CLIENT_ID is required")
  }

  // Apicalypse query: cover, screenshots, artworks (배경 이미지용)
  const body = `fields name, cover.url, first_release_date, screenshots.url, artworks.url; search "${gameName.trim()}"; limit 1;`

  const res = await fetch(IGDB_GAMES_URL, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`IGDB search failed: ${res.status} ${text}`)
  }

  const data = (await res.json()) as Array<{
    name?: string
    cover?: { url?: string }
    first_release_date?: number
    screenshots?: Array<{ url?: string }>
    artworks?: Array<{ url?: string }>
  }>

  if (!Array.isArray(data) || data.length === 0) {
    return null
  }

  const game = data[0]
  const coverUrl = game.cover?.url

  if (!coverUrl) {
    return null
  }

  // Cover: t_thumb → t_cover_big, https: 강제
  const highResCover = ensureHttpsUrl(coverUrl.replace(/t_thumb/g, "t_cover_big"))

  // Backdrop: screenshots[0] 우선, 없으면 artworks[0]. t_thumb → t_1080p
  let backdropUrl: string | null = null
  const firstScreenshot = game.screenshots?.[0]?.url
  const firstArtwork = game.artworks?.[0]?.url
  const rawBackdrop = firstScreenshot || firstArtwork
  if (rawBackdrop) {
    backdropUrl = ensureHttpsUrl(rawBackdrop.replace(/t_thumb/g, "t_1080p"))
  }

  return {
    title: game.name ?? gameName,
    image_url: highResCover,
    backdrop_url: backdropUrl,
    release_date: game.first_release_date ?? null,
  }
}
