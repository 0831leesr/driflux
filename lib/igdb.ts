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

/** 한글/약어 → IGDB 공식 영문 타이틀 매핑 (검색 성공률 향상) */
const KNOWN_GAME_MAP: Record<string, string> = {
  "리그 오브 레전드": "League of Legends",
  lol: "League of Legends",
  롤: "League of Legends",
  발로란트: "Valorant",
  valorant: "Valorant",
  배틀그라운드: "PUBG: BATTLEGROUNDS",
  pubg: "PUBG: BATTLEGROUNDS",
  배그: "PUBG: BATTLEGROUNDS",
  "오버워치 2": "Overwatch 2",
  "overwatch 2": "Overwatch 2",
  "overwatch-2": "Overwatch 2",
  overwatch2: "Overwatch 2",
  tft: "Teamfight Tactics",
  "전략적 팀 전투": "Teamfight Tactics",
  로스트아크: "Lost Ark",
  lostark: "Lost Ark",
  "lost ark": "Lost Ark",
  마인크래프트: "Minecraft",
  minecraft: "Minecraft",
  "던전 앤 파이터": "Dungeon and Fighter",
  dnf: "Dungeon and Fighter",
  "카운터 스트라이크 2": "Counter-Strike 2",
  "counter-strike 2": "Counter-Strike 2",
  cs2: "Counter-Strike 2",
  "에이펙스 레전드": "Apex Legends",
  "apex legends": "Apex Legends",
  apex: "Apex Legends",
  "디아블로 4": "Diablo IV",
  "diablo 4": "Diablo IV",
  diablo4: "Diablo IV",
  피파: "EA SPORTS FC 24",
  fifa: "EA SPORTS FC 24",
  "이스 포트리스": "Ys",
  "스타크래프트 2": "StarCraft II",
  "starcraft 2": "StarCraft II",
  스2: "StarCraft II",
}

const FIELDS =
  "name, cover.url, first_release_date, screenshots.url, artworks.url, category, summary, genres.name, themes.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher"

export interface IGDBGameResult {
  title: string
  image_url: string
  backdrop_url: string | null
  release_date: number | null
  summary: string | null
  tags: string[]
  developer: string | null
  publisher: string | null
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

/** 검색어 → IGDB slug 형식 (소문자, 공백/특수문자 → '-') */
function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s.:]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

type RawGame = {
  name?: string
  cover?: { url?: string }
  first_release_date?: number
  category?: number
  summary?: string
  screenshots?: Array<{ url?: string }>
  artworks?: Array<{ url?: string }>
  genres?: Array<{ name?: string }>
  themes?: Array<{ name?: string }>
  involved_companies?: Array<{
    company?: { name?: string }
    developer?: boolean
    publisher?: boolean
  }>
}

/** Raw IGDB 응답 → IGDBGameResult 변환 */
function parseGameToResult(game: RawGame, fallbackTitle: string): IGDBGameResult | null {
  const coverUrl = game.cover?.url
  if (!coverUrl) return null

  const highResCover = ensureHttpsUrl(coverUrl.replace(/t_thumb/g, "t_cover_big"))
  let backdropUrl: string | null = null
  const rawBackdrop = game.screenshots?.[0]?.url || game.artworks?.[0]?.url
  if (rawBackdrop) {
    backdropUrl = ensureHttpsUrl(rawBackdrop.replace(/t_thumb/g, "t_1080p"))
  }

  // genres + themes → tags (중복 제거)
  const genreNames = (game.genres ?? []).map((g) => g.name).filter((n): n is string => !!n?.trim())
  const themeNames = (game.themes ?? []).map((t) => t.name).filter((n): n is string => !!n?.trim())
  const tags = [...new Set([...genreNames, ...themeNames])]

  // involved_companies: developer/publisher 우선 추출
  const companies = game.involved_companies ?? []
  let developer: string | null = null
  let publisher: string | null = null
  for (const inv of companies) {
    const name = inv.company?.name?.trim()
    if (!name) continue
    if (inv.developer && !developer) developer = name
    if (inv.publisher && !publisher) publisher = name
    if (developer && publisher) break
  }
  // 개발사/배급사 없으면 첫 회사라도 사용
  if (!developer && !publisher && companies[0]?.company?.name) {
    developer = companies[0].company.name.trim() || null
  }

  return {
    title: game.name ?? fallbackTitle,
    image_url: highResCover,
    backdrop_url: backdropUrl,
    release_date: game.first_release_date ?? null,
    summary: game.summary?.trim() || null,
    tags,
    developer,
    publisher,
  }
}

/** category 우선순위: 0=메인게임, 1=DLC, 2=확장팩... 메인게임 우선 정렬 */
function sortByCategory(a: RawGame, b: RawGame): number {
  const catA = a.category ?? 999
  const catB = b.category ?? 999
  return catA - catB
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

/** IGDB API 호출 및 파싱 (body만 전달) */
async function igdbFetch(body: string): Promise<RawGame[]> {
  const token = await getIGDBToken()
  const clientId = process.env.TWITCH_CLIENT_ID
  if (!clientId) throw new Error("TWITCH_CLIENT_ID is required")

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
    throw new Error(`IGDB API failed: ${res.status} ${text}`)
  }

  const data = (await res.json()) as RawGame[]
  return Array.isArray(data) ? data : []
}

/**
 * Search for a game on IGDB (3-stage strategy for higher hit rate).
 *
 * 1. Known map: 한글/약어 → 공식 영문 타이틀
 * 2. Slug match: where slug = "..." (정확 일치)
 * 3. Text search: search "..." (fallback)
 *
 * @param gameName - Game name (Korean, abbreviation, or English)
 * @returns { title, image_url, backdrop_url, release_date } or null
 */
export async function searchIGDBGame(gameName: string): Promise<IGDBGameResult | null> {
  const trimmed = gameName?.trim()
  if (!trimmed) return null

  const fallbackTitle = trimmed

  // ── Stage 1: Known Games Map ──
  const mapKey = trimmed.toLowerCase().trim()
  const mappedTitle = KNOWN_GAME_MAP[mapKey]
  if (mappedTitle) {
    const body = `fields ${FIELDS}; search "${mappedTitle.replace(/"/g, '\\"')}"; limit 5;`
    const data = await igdbFetch(body)
    const sorted = data.filter((g) => g.cover?.url).sort(sortByCategory)
    if (sorted.length > 0) {
      return parseGameToResult(sorted[0], mappedTitle)
    }
  }

  // ── Stage 2: Slug Match (영문/줄임말일 때 정확 매칭) ──
  const slug = toSlug(trimmed)
  if (slug.length >= 2) {
    const body = `fields ${FIELDS}; where slug = "${slug.replace(/"/g, '\\"')}"; limit 5;`
    const data = await igdbFetch(body)
    const sorted = data.filter((g) => g.cover?.url).sort(sortByCategory)
    if (sorted.length > 0) {
      return parseGameToResult(sorted[0], fallbackTitle)
    }
  }

  // ── Stage 3: Text Search (Fallback) ──
  const searchTerm = mappedTitle ?? trimmed
  const body = `fields ${FIELDS}; search "${searchTerm.replace(/"/g, '\\"')}"; limit 10;`
  const data = await igdbFetch(body)
  const sorted = data.filter((g) => g.cover?.url).sort(sortByCategory)
  if (sorted.length > 0) {
    return parseGameToResult(sorted[0], fallbackTitle)
  }

  return null
}
