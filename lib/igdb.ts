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
const IGDB_BASE = "https://api.igdb.com/v4"
const IGDB_GAMES_URL = `${IGDB_BASE}/games`
const IGDB_ALT_NAMES_URL = `${IGDB_BASE}/alternative_names`
const IGDB_GAME_LOCALIZATIONS_URL = `${IGDB_BASE}/game_localizations`
const IGDB_EXTERNAL_GAMES_URL = `${IGDB_BASE}/external_games`

const FIELDS =
  "name, cover.url, first_release_date, screenshots.url, artworks.url, category, total_rating_count, summary, genres.name, themes.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher"

/** 메인 게임만 (공통 쿼리 조건) */
const COMMON_WHERE = "category = 0"

export interface IGDBGameResult {
  title: string
  /** cover가 없으면 null (태그·요약 등은 반환) */
  image_url: string | null
  backdrop_url: string | null
  release_date: number | null
  summary: string | null
  tags: string[]
  developer: string | null
  publisher: string | null
  /** IGDB game ID (for Steam App ID lookup via external_games) */
  igdb_game_id?: number
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
  total_rating_count?: number
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

/** Raw IGDB 응답 → IGDBGameResult 변환 (cover 없어도 태그·요약 등 반환) */
function parseGameToResult(game: RawGame, fallbackTitle: string, igdbGameId?: number): IGDBGameResult {
  const coverUrl = game.cover?.url?.trim()
  const imageUrl = coverUrl
    ? ensureHttpsUrl(coverUrl.replace(/t_thumb/g, "t_cover_big"))
    : null

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
    image_url: imageUrl,
    backdrop_url: backdropUrl,
    release_date: game.first_release_date ?? null,
    summary: game.summary?.trim() || null,
    tags,
    developer,
    publisher,
    ...(igdbGameId != null && { igdb_game_id: igdbGameId }),
  }
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

/** IGDB API 호출 (엔드포인트별) */
async function igdbFetch<T = unknown>(endpoint: string, body: string): Promise<T[]> {
  const token = await getIGDBToken()
  const clientId = process.env.TWITCH_CLIENT_ID
  if (!clientId) throw new Error("TWITCH_CLIENT_ID is required")

  const url = endpoint.startsWith("http") ? endpoint : `${IGDB_BASE}/${endpoint.replace(/^\//, "")}`
  const res = await fetch(url, {
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
    throw new Error(`IGDB API failed (${endpoint}): ${res.status} ${text}`)
  }

  const data = (await res.json()) as T | T[]
  return Array.isArray(data) ? data : [data]
}

/** 게임 ID로 상세 정보 조회 (2단계 검색의 최종 단계). cover 없어도 반환. */
async function fetchGameDetails(gameId: number): Promise<RawGame | null> {
  const body = `fields ${FIELDS}; where id = ${gameId};`
  const data = await igdbFetch<RawGame>(IGDB_GAMES_URL, body)
  const game = data[0]
  if (!game) return null
  return game
}

/**
 * IGDB 검색 - 엔드포인트 분리 2단계 (ID 탐색 → 상세 조회)
 *
 * Step 1: /game_localizations - 한국어 정발명
 * Step 2: /alternative_names - 약칭/별명
 * Step 3: /games - 슬러그 정확 매칭
 * Step 4: /games - 퍼지 검색 (Fallback, sort 금지)
 *
 * @param koreanTitle - 치지직 한글 제목
 * @param englishTitle - 치지직 영문 슬러그/제목
 * @returns { title, image_url, backdrop_url, ... } or null. image_url은 cover 없으면 null.
 */
export async function searchIGDBGame(
  koreanTitle?: string | null,
  englishTitle?: string | null
): Promise<IGDBGameResult | null> {
  let korean = koreanTitle?.trim() ?? ""
  let english = englishTitle?.trim() ?? ""
  if (!english && korean) english = korean
  if (!korean && english) korean = english
  if (!korean && !english) return null

  const fallbackTitle = korean || english
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')

  // ── Step 1: 한국어 타이틀 검색 (/game_localizations) ──
  if (korean.length >= 1) {
    const body = `fields game; where name = "${esc(korean)}"; limit 1;`
    const res = await igdbFetch<{ game?: number }>(IGDB_GAME_LOCALIZATIONS_URL, body)
    const foundId = res[0]?.game
    if (typeof foundId === "number") {
      console.log(`[IGDB] Found game ID ${foundId} via Step 1 (Localization: ${korean})`)
      const game = await fetchGameDetails(foundId)
      if (game) return parseGameToResult(game, fallbackTitle, foundId)
    }
  }
  await new Promise((r) => setTimeout(r, 250))

  // ── Step 2: 약칭/별명 검색 (/alternative_names) ──
  const altConditions: string[] = []
  if (english.length >= 1) altConditions.push(`name = "${esc(english)}"`)
  if (korean.length >= 1) altConditions.push(`name = "${esc(korean)}"`)
  if (altConditions.length > 0) {
    const whereClause = altConditions.join(" | ")
    const body = `fields game; where ${whereClause}; limit 1;`
    const res = await igdbFetch<{ game?: number }>(IGDB_ALT_NAMES_URL, body)
    const foundId = res[0]?.game
    if (typeof foundId === "number") {
      console.log(`[IGDB] Found game ID ${foundId} via Step 2 (Alt Name: ${english || korean})`)
      const game = await fetchGameDetails(foundId)
      if (game) return parseGameToResult(game, fallbackTitle, foundId)
    }
  }
  await new Promise((r) => setTimeout(r, 250))

  // ── Step 3: 슬러그 검색 (/games) ──
  if (english.length >= 2) {
    const slug = toSlug(english)
    if (slug.length >= 2) {
      const body = `fields id; where slug = "${esc(slug)}" & ${COMMON_WHERE}; limit 1;`
      const res = await igdbFetch<{ id?: number }>(IGDB_GAMES_URL, body)
      const foundId = res[0]?.id
      if (typeof foundId === "number") {
        console.log(`[IGDB] Found game ID ${foundId} via Step 3 (Slug: ${english})`)
        const game = await fetchGameDetails(foundId)
        if (game) return parseGameToResult(game, fallbackTitle, foundId)
      }
    }
  }
  await new Promise((r) => setTimeout(r, 250))

  // ── Step 4: 퍼지 검색 (/games) - search 시 sort 금지 ──
  const searchTerm = english || korean
  const body = `search "${esc(searchTerm)}"; fields id; limit 1;`
  const res = await igdbFetch<{ id?: number }>(IGDB_GAMES_URL, body)
  const foundId = res[0]?.id
  if (typeof foundId === "number") {
    console.log(`[IGDB] Found game ID ${foundId} via Step 4 (Fuzzy: ${searchTerm})`)
    const game = await fetchGameDetails(foundId)
    if (game) return parseGameToResult(game, fallbackTitle, foundId)
  }

  return null
}

/** external_game_source: 1 = Steam */
const IGDB_EXTERNAL_SOURCE_STEAM = 1

/**
 * IGDB 게임 ID로 Steam App ID 조회 (external_games)
 * @param igdbGameId - IGDB game id
 * @returns Steam app ID or null
 */
export async function fetchSteamAppIdFromIGDB(igdbGameId: number): Promise<number | null> {
  try {
    const esc = (n: number) => String(n)
    const body = `fields uid; where game = ${esc(igdbGameId)} & external_game_source = ${IGDB_EXTERNAL_SOURCE_STEAM}; limit 1;`
    const res = await igdbFetch<{ uid?: string }>(IGDB_EXTERNAL_GAMES_URL, body)
    const uid = res[0]?.uid
    if (uid == null || uid === "") return null
    const appId = parseInt(uid, 10)
    return Number.isNaN(appId) ? null : appId
  } catch {
    return null
  }
}
