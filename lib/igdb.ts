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
const IGDB_RELEASE_DATES_URL = `${IGDB_BASE}/release_dates`

const FIELDS =
  "name, cover.url, first_release_date, screenshots.url, artworks.url, category, total_rating_count, summary, aggregated_rating, genres.name, themes.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher"

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
  /** 전문 평론가 점수 (aggregated_rating, 100점 만점, 소수점 반올림 정수) */
  critic_score: number | null
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
  aggregated_rating?: number
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

  // aggregated_rating: 100점 만점 Float → 소수점 첫째 자리 반올림 정수, 없으면 null
  const rawRating = game.aggregated_rating
  const critic_score =
    rawRating != null && !Number.isNaN(rawRating)
      ? Math.round(rawRating)
      : null

  return {
    title: game.name ?? fallbackTitle,
    image_url: imageUrl,
    backdrop_url: backdropUrl,
    release_date: game.first_release_date ?? null,
    summary: game.summary?.trim() || null,
    tags,
    developer,
    publisher,
    critic_score,
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
 * IGDB release_dates에서 여러 플랫폼 출시일 중 가장 빠른 날짜 조회
 * @param igdbGameId - IGDB game id
 * @returns Unix timestamp (초) 또는 null. date=0(TBA/미정)은 제외.
 */
export async function fetchEarliestReleaseDateFromIGDB(igdbGameId: number): Promise<number | null> {
  try {
    const body = `fields date; where game = ${igdbGameId} & date > 0; sort date asc; limit 1;`
    const res = await igdbFetch<{ date?: number }>(IGDB_RELEASE_DATES_URL, body)
    const date = res[0]?.date
    if (date == null || date <= 0) return null
    return date
  } catch {
    return null
  }
}

export interface IGDBAnticipatedGame {
  id: number
  name: string
  slug?: string
  first_release_date?: number
  cover?: { url?: string }
  screenshots?: Array<{ url?: string }>
  artworks?: Array<{ url?: string }>
  hypes?: number
  summary?: string
}

/** 기대작 후보 + 캘린더에 쓸 확정 미래 출시 시각(Unix 초) */
export interface IGDBAnticipatedGameResolved extends IGDBAnticipatedGame {
  resolved_release_date: number
  /** IGDB games.name (영문/표준 타이틀, game_category 용) */
  english_title: string
  /** 한글 정발명이 있으면 한글, 없으면 english_title */
  display_title: string
  /** 스크린샷 → 아트워크 → 커버 순, 없으면 null */
  header_image_url: string | null
}

const HANGUL_RE = /[가-힣]/

/**
 * game_localizations에서 한글 이름이 있는 항목만 모아 게임별로 가장 긴 이름을 선택
 */
async function fetchKoreanTitlesByGameIds(gameIds: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>()
  if (gameIds.length === 0) return map

  const unique = [...new Set(gameIds)]
  const orClause = unique.map((id) => `game = ${id}`).join(" | ")
  const body = `fields game, name; where (${orClause}); limit 500;`

  try {
    const rows = await igdbFetch<{ game?: number; name?: string }>(IGDB_GAME_LOCALIZATIONS_URL, body)
    for (const row of rows) {
      const gid = row.game
      const name = row.name?.trim()
      if (gid == null || !name || !HANGUL_RE.test(name)) continue
      const prev = map.get(gid)
      if (prev === undefined || name.length > prev.length) map.set(gid, name)
    }
  } catch (err) {
    console.error("[IGDB] fetchKoreanTitlesByGameIds error:", err)
  }
  return map
}

function pickHeaderImageFromAnticipatedGame(game: IGDBAnticipatedGame): string | null {
  const shot = game.screenshots?.[0]?.url?.trim()
  const art = game.artworks?.[0]?.url?.trim()
  const cov = game.cover?.url?.trim()
  let raw: string | null = null
  let useCoverSizing = false
  if (shot) raw = shot
  else if (art) raw = art
  else if (cov) {
    raw = cov
    useCoverSizing = true
  }
  if (!raw) return null
  let u = raw.startsWith("//") ? `https:${raw}` : raw
  if (!u.startsWith("http")) u = `https://${u}`
  u = useCoverSizing ? u.replace(/t_thumb/g, "t_cover_big") : u.replace(/t_thumb/g, "t_1080p")
  return u
}

/**
 * 여러 게임에 대해 date > now 인 release_dates 중 게임별 가장 이른 날짜 조회
 */
async function fetchFutureReleaseDatesByGameIds(
  gameIds: number[],
  nowUnix: number
): Promise<Map<number, number>> {
  const map = new Map<number, number>()
  if (gameIds.length === 0) return map

  const unique = [...new Set(gameIds)]
  const orClause = unique.map((id) => `game = ${id}`).join(" | ")
  const body = `fields game, date; where (${orClause}) & date > ${nowUnix}; sort date asc; limit 500;`

  try {
    const rows = await igdbFetch<{ game?: number; date?: number }>(IGDB_RELEASE_DATES_URL, body)
    for (const row of rows) {
      const gid = row.game
      const d = row.date
      if (gid == null || d == null || d <= 0) continue
      const prev = map.get(gid)
      if (prev === undefined || d < prev) map.set(gid, d)
    }
  } catch (err) {
    console.error("[IGDB] fetchFutureReleaseDatesByGameIds error:", err)
  }
  return map
}

function isAlreadyReleased(game: IGDBAnticipatedGame, nowUnix: number): boolean {
  const frd = game.first_release_date
  return frd != null && frd > 0 && frd <= nowUnix
}

const ANTICIPATED_GAME_FIELDS =
  "fields id, name, slug, first_release_date, cover.url, screenshots.url, artworks.url, hypes, summary;"

/**
 * IGDB 기대작 후보: `category=0` 전체를 hypes 정렬하면 이미 출시된 대작만 상단에 몰립니다.
 * 미래 first_release_date 가 있는 게임 + TBA(null/0) 게임을 각각 hypes 정렬해 합칩니다.
 */
async function fetchAnticipatedGameCandidates(
  poolSize: number,
  nowUnix: number
): Promise<{ games: IGDBAnticipatedGame[]; futurePool: number; tbaPool: number }> {
  const bodyFuture = `${ANTICIPATED_GAME_FIELDS} where category = 0 & first_release_date > ${nowUnix}; sort hypes desc; limit ${poolSize};`
  const bodyTba = `${ANTICIPATED_GAME_FIELDS} where category = 0 & (first_release_date = null | first_release_date = 0); sort hypes desc; limit ${poolSize};`

  let futureGames: IGDBAnticipatedGame[] = []
  let tbaGames: IGDBAnticipatedGame[] = []
  try {
    futureGames = await igdbFetch<IGDBAnticipatedGame>(IGDB_GAMES_URL, bodyFuture)
  } catch (err) {
    console.error("[IGDB] anticipated candidates (future first_release_date):", err)
  }
  try {
    tbaGames = await igdbFetch<IGDBAnticipatedGame>(IGDB_GAMES_URL, bodyTba)
  } catch (err) {
    console.error("[IGDB] anticipated candidates (TBA null|0):", err)
    try {
      const bodyTbaNullOnly = `${ANTICIPATED_GAME_FIELDS} where category = 0 & first_release_date = null; sort hypes desc; limit ${poolSize};`
      tbaGames = await igdbFetch<IGDBAnticipatedGame>(IGDB_GAMES_URL, bodyTbaNullOnly)
    } catch (err2) {
      console.error("[IGDB] anticipated candidates (TBA null only):", err2)
    }
  }

  const byId = new Map<number, IGDBAnticipatedGame>()
  for (const g of [...futureGames, ...tbaGames]) {
    if (!byId.has(g.id)) byId.set(g.id, g)
  }

  const games = [...byId.values()]
    .sort((a, b) => (b.hypes ?? 0) - (a.hypes ?? 0))
    .slice(0, poolSize * 2)

  return { games, futurePool: futureGames.length, tbaPool: tbaGames.length }
}

/** 크론/호출부에서 IGDB 풀 상태를 진단할 때 사용 */
export interface FetchAnticipatedGamesStats {
  igdbFuturePool: number
  igdbTbaPool: number
  mergedCandidates: number
  unreleasedCandidates: number
  resolvedWithDate: number
}

export interface FetchAnticipatedGamesResult {
  games: IGDBAnticipatedGameResolved[]
  stats: FetchAnticipatedGamesStats
}

/**
 * IGDB Top Anticipated Games → 미래 출시일이 정해진 항목만 상위 N개
 *
 * 미출시 후보만 모은 뒤 hypes 순으로 `release_dates`로 TBA 출시일을 보완합니다.
 *
 * @param take - 반환할 게임 수 (기본 10)
 * @param poolSize - 미출시 풀당 API limit (기본 50, 두 쿼리 합쳐 최대 ~2×poolSize 후 dedupe)
 */
export async function fetchTopAnticipatedGames(
  take = 10,
  poolSize = 50
): Promise<FetchAnticipatedGamesResult> {
  const nowUnix = Math.floor(Date.now() / 1000)
  const emptyStats = (partial: Partial<FetchAnticipatedGamesStats> = {}): FetchAnticipatedGamesStats => ({
    igdbFuturePool: partial.igdbFuturePool ?? 0,
    igdbTbaPool: partial.igdbTbaPool ?? 0,
    mergedCandidates: partial.mergedCandidates ?? 0,
    unreleasedCandidates: partial.unreleasedCandidates ?? 0,
    resolvedWithDate: partial.resolvedWithDate ?? 0,
  })

  let candidates: IGDBAnticipatedGame[] = []
  let futurePool = 0
  let tbaPool = 0
  try {
    const pack = await fetchAnticipatedGameCandidates(poolSize, nowUnix)
    candidates = pack.games
    futurePool = pack.futurePool
    tbaPool = pack.tbaPool
  } catch (err) {
    console.error("[IGDB] fetchTopAnticipatedGames (candidates) error:", err)
    return { games: [], stats: emptyStats() }
  }

  if (candidates.length === 0) {
    return { games: [], stats: emptyStats({ igdbFuturePool: futurePool, igdbTbaPool: tbaPool }) }
  }

  const unreleased = candidates.filter((g) => !isAlreadyReleased(g, nowUnix))
  if (unreleased.length === 0) {
    return {
      games: [],
      stats: emptyStats({
        igdbFuturePool: futurePool,
        igdbTbaPool: tbaPool,
        mergedCandidates: candidates.length,
      }),
    }
  }

  const koreanByGame = await fetchKoreanTitlesByGameIds(unreleased.map((g) => g.id))

  const needReleaseRows = unreleased.filter((g) => {
    const frd = g.first_release_date
    return frd == null || frd <= 0 || frd <= nowUnix
  })
  const releaseByGame = await fetchFutureReleaseDatesByGameIds(
    needReleaseRows.map((g) => g.id),
    nowUnix
  )

  const resolved: IGDBAnticipatedGameResolved[] = []
  for (const g of unreleased) {
    const frd = g.first_release_date
    let ts: number | null =
      frd != null && frd > 0 && frd > nowUnix ? frd : (releaseByGame.get(g.id) ?? null)
    if (ts == null) continue
    const english = g.name.trim()
    const display = koreanByGame.get(g.id)?.trim() || english
    resolved.push({
      ...g,
      resolved_release_date: ts,
      english_title: english,
      display_title: display,
      header_image_url: pickHeaderImageFromAnticipatedGame(g),
    })
    if (resolved.length >= take) break
  }

  return {
    games: resolved,
    stats: {
      igdbFuturePool: futurePool,
      igdbTbaPool: tbaPool,
      mergedCandidates: candidates.length,
      unreleasedCandidates: unreleased.length,
      resolvedWithDate: resolved.length,
    },
  }
}

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
