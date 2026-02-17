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
const IGDB_ALT_NAMES_URL = "https://api.igdb.com/v4/alternative_names"

const FIELDS =
  "name, cover.url, first_release_date, screenshots.url, artworks.url, category, total_rating_count, summary, genres.name, themes.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher"

/** 메인 게임만 + 인기도 정렬 (공통 쿼리 조건) */
const COMMON_WHERE = "category = 0"
const COMMON_SORT = "total_rating_count desc"

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

/** 인기도(total_rating_count) 기준 정렬 */
function sortByPopularity(a: RawGame & { total_rating_count?: number }, b: RawGame & { total_rating_count?: number }): number {
  const aPop = a.total_rating_count ?? 0
  const bPop = b.total_rating_count ?? 0
  return bPop - aPop
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

/** IGDB Games API 호출 */
async function igdbGamesFetch(body: string): Promise<RawGame[]> {
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

/** IGDB Alternative Names API에서 검색 후 game IDs 반환 */
async function igdbSearchByAltName(searchName: string): Promise<number[]> {
  const token = await getIGDBToken()
  const clientId = process.env.TWITCH_CLIENT_ID
  if (!clientId) throw new Error("TWITCH_CLIENT_ID is required")

  const escaped = searchName.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
  const body = `fields game; where name = "${escaped}"; limit 20;`

  const res = await fetch(IGDB_ALT_NAMES_URL, {
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
    throw new Error(`IGDB alternative_names API failed: ${res.status} ${text}`)
  }

  const data = (await res.json()) as Array<{ game?: number }>
  const ids = (Array.isArray(data) ? data : [])
    .map((r) => r.game)
    .filter((id): id is number => typeof id === "number")
  return [...new Set(ids)]
}

/** game IDs로 Games 조회 (메인게임만, 인기도 정렬) */
async function igdbFetchGamesByIds(ids: number[]): Promise<RawGame[]> {
  if (ids.length === 0) return []
  const idList = ids.join(",")
  const body = `fields ${FIELDS}; where id = (${idList}) & ${COMMON_WHERE}; sort ${COMMON_SORT}; limit ${ids.length};`
  return igdbGamesFetch(body)
}

/**
 * IGDB 검색 (4단계 Waterfall - 한국어 우선, 인기도 기반)
 *
 * 1. 한국어 타이틀 정확 매칭 (alternative_names)
 * 2. 영문 약칭/대체 이름 매칭 (alternative_names)
 * 3. 영문 슬러그 정확 매칭
 * 4. 퍼지 검색 (Fallback)
 *
 * 공통 조건: category = 0 (메인 게임만), sort total_rating_count desc
 *
 * @param koreanTitle - 치지직 한글 제목
 * @param englishTitle - 치지직 영문 슬러그/제목
 * @returns { title, image_url, backdrop_url, ... } or null
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

  // ── Step 1: 한국어 타이틀 정확 매칭 (1순위) ──
  if (korean.length >= 1) {
    const gameIds = await igdbSearchByAltName(korean)
    if (gameIds.length > 0) {
      const data = await igdbFetchGamesByIds(gameIds)
      const sorted = data.filter((g) => g.cover?.url).sort(sortByPopularity)
      if (sorted.length > 0) {
        console.log(`[IGDB] Found "${sorted[0].name}" via Step 1 (Korean: ${korean})`)
        return parseGameToResult(sorted[0], fallbackTitle)
      }
    }
  }
  await new Promise((r) => setTimeout(r, 250))

  // ── Step 2: 영문 정확 매칭 (메인 name + alternative_names) (2순위) ──
  if (english.length >= 1) {
    // 2a: 메인 name 정확 매칭
    const nameBody = `fields ${FIELDS}; where name = "${esc(english)}" & ${COMMON_WHERE}; sort ${COMMON_SORT}; limit 5;`
    const nameData = await igdbGamesFetch(nameBody)
    const nameSorted = nameData.filter((g) => g.cover?.url).sort(sortByPopularity)
    if (nameSorted.length > 0) {
      console.log(`[IGDB] Found "${nameSorted[0].name}" via Step 2 (Name: ${english})`)
      return parseGameToResult(nameSorted[0], fallbackTitle)
    }

    // 2b: alternative_names 매칭
    const gameIds = await igdbSearchByAltName(english)
    if (gameIds.length > 0) {
      const data = await igdbFetchGamesByIds(gameIds)
      const sorted = data.filter((g) => g.cover?.url).sort(sortByPopularity)
      if (sorted.length > 0) {
        console.log(`[IGDB] Found "${sorted[0].name}" via Step 2 (Acronym: ${english})`)
        return parseGameToResult(sorted[0], fallbackTitle)
      }
    }
    if (english !== english.toLowerCase()) {
      const gameIds = await igdbSearchByAltName(english.toLowerCase())
      if (gameIds.length > 0) {
        const data = await igdbFetchGamesByIds(gameIds)
        const sorted = data.filter((g) => g.cover?.url).sort(sortByPopularity)
        if (sorted.length > 0) {
          console.log(`[IGDB] Found "${sorted[0].name}" via Step 2 (Acronym: ${english})`)
          return parseGameToResult(sorted[0], fallbackTitle)
        }
      }
    }
  }
  await new Promise((r) => setTimeout(r, 250))

  // ── Step 3: 슬러그 매칭 (3순위, sort 제거 - 슬러그 유니크) ──
  if (english.length >= 2) {
    const slug = toSlug(english)
    if (slug.length >= 2) {
      const body = `fields ${FIELDS}; where slug = "${esc(slug)}" & ${COMMON_WHERE}; limit 5;`
      const data = await igdbGamesFetch(body)
      const sorted = data.filter((g) => g.cover?.url).sort(sortByPopularity)
      if (sorted.length > 0) {
        console.log(`[IGDB] Found "${sorted[0].name}" via Step 3 (Slug: ${english})`)
        return parseGameToResult(sorted[0], fallbackTitle)
      }
    }
  }
  await new Promise((r) => setTimeout(r, 250))

  // ── Step 4: 퍼지 검색 (4순위 - search 시 sort 절대 금지, 406 에러 원인) ──
  const searchTerm = korean || english
  const body = `search "${esc(searchTerm)}"; fields ${FIELDS}; where ${COMMON_WHERE}; limit 10;`
  const data = await igdbGamesFetch(body)
  const sorted = data.filter((g) => g.cover?.url).sort(sortByPopularity)
  if (sorted.length > 0) {
    console.log(`[IGDB] Found "${sorted[0].name}" via Step 4 (Fuzzy: ${searchTerm})`)
    return parseGameToResult(sorted[0], fallbackTitle)
  }

  return null
}
