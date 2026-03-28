"use server"

import { unstable_cache } from "next/cache"
import { createClient, createClientForCache } from "@/lib/supabase/server"
import type { EventRow } from "@/lib/types"
import { getBestGameImage, getDisplayGameTitle, getEffectiveDiscountRate } from "@/lib/utils"
import { getGameMappings, resolveMapping, applyMappingOverridesToGame, type GameMapping } from "@/lib/mappings"
import { getChzzkStreamsByCategory, searchChzzkLives, getTopLiveGames } from "@/lib/chzzk"

/* ── Cache config (revalidate in seconds) ── */
const CACHE_REVALIDATE_TRENDING = 30
const CACHE_REVALIDATE_STREAMS = 30
const CACHE_REVALIDATE_EVENTS = 120

/**
 * Time Window for stream display - DO NOT add .gt/.gte(updated_at) or last_chzzk_update
 * filters shorter than 30 minutes in fetch queries. Cron runs every 10 min; a short
 * window causes data to disappear between runs ("Time Window Gap"). Display queries
 * use is_live only - no time filter.
 */

/* ── Types ── */
export interface GameRow {
  id: number
  title: string
  korean_title?: string | null
  english_title?: string | null
  steam_appid: number | null
  cover_image_url: string | null
  header_image_url?: string | null
  background_image_url?: string | null
  discount_rate: number | null
  price_krw?: number | null
  original_price_krw?: number | null
  currency?: string | null
  is_free?: boolean | null
  last_data_update?: string | null
  game_data_update?: string | null
  top_tags?: string[] | null
  short_description?: string | null
  developer?: string | null
  publisher?: string | null
  critic_score?: number | null
  steam_review_desc?: string | null
  steam_positive_ratio?: number | null
  steam_total_reviews?: number | null
  /** Game release date (from IGDB or Steam) */
  release_date?: string | null
}

export interface TagRow {
  id: number
  name: string
  slug?: string
}

export interface GameWithTags extends GameRow {
  tags: TagRow[]
}

/* ── Helpers ── */
function formatViewers(count: number | null): string {
  if (!count) return "0"
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return String(count)
}

/** PostgREST .or() 필터 값 이스케이프 (쉼표, 따옴표 등 특수문자 처리) */
function escapePostgrestOrValue(val: string): string {
  const escaped = val.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
  return `"${escaped}"`
}


/* ── Fetch all games ── */
export async function fetchGames(): Promise<GameRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("id")
  if (error) {
    console.error("fetchGames error:", error.message)
    return []
  }
  return data ?? []
}

/* ── Fetch all tags ── */
export async function fetchTags(): Promise<TagRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("name")
  if (error) {
    console.error("fetchTags error:", error.message)
    return []
  }
  return data ?? []
}

/* ── Fetch game by ID ── */
export async function fetchGameById(id: number): Promise<GameRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .limit(1)
  if (error || !data || data.length === 0) return null
  const game = data[0] as GameRow
  const mappings = await getGameMappings()
  const mapping = resolveMapping(mappings, game.title ?? "", game.english_title ?? null, game.korean_title ?? null)
  return applyMappingOverridesToGame(game, mapping) as GameRow
}

/* ── Fetch multiple games by IDs ── */
export async function fetchGamesByIds(ids: number[]): Promise<GameRow[]> {
  if (ids.length === 0) return []
  
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .in("id", ids)
  
  if (error) {
    console.error("fetchGamesByIds error:", error.message)
    return []
  }
  
  const mappings = await getGameMappings()
  const gameMap = new Map(
    (data ?? []).map((game: GameRow) => {
      const m = resolveMapping(mappings, game.title ?? "", game.english_title ?? null, game.korean_title ?? null)
      return [game.id, applyMappingOverridesToGame(game, m) as GameRow]
    })
  )
  return ids.map(id => gameMap.get(id)).filter((game): game is GameRow => game !== undefined)
}

/* ── Fetch games by tag ID ── */
export async function fetchGamesByTagId(tagId: number): Promise<GameRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("game_tags")
    .select("games(*)")
    .eq("tag_id", tagId)
  if (error || !data) return []
  return data
    .map((row: any) => row.games)
    .filter((g: any) => g !== null)
}

/* ── Fetch streams for followed tags (Chzzk API) ── */
export async function fetchStreamsForFollowedTags(tagNames: string[]) {
  if (tagNames.length === 0) return []

  const supabase = await createClient()

  // 팔로우 태그를 포함한 게임 목록 조회 (태그당 최대 5개, 전체 최대 10개)
  const { data: games } = await supabase
    .from("games")
    .select("id, title, korean_title, english_title, header_image_url, cover_image_url, discount_rate")
    .or(tagNames.map((tag) => `top_tags.cs.{${tag}}`).join(","))
    .limit(10)

  if (!games?.length) return []

  const mappings = await getGameMappings()
  const eligible = games.filter((g: any) => g.english_title?.trim())

  const results = await Promise.allSettled(
    eligible.map((g: any) => getChzzkStreamsByCategory(g.english_title.trim()))
  )

  const allStreams: any[] = []
  const seen = new Set<string>()

  results.forEach((result, idx) => {
    if (result.status !== "fulfilled") return
    const game = eligible[idx] as any
    const mapping = resolveMapping(mappings, game.title, game.english_title, game.korean_title)
    const overrides = applyMappingOverridesToGame(game, mapping)
    const gameCover = getBestGameImage(
      overrides.header_image_url ?? game.header_image_url,
      overrides.cover_image_url ?? game.cover_image_url
    )
    const gameTitle =
      getDisplayGameTitle(overrides) ?? game.korean_title ?? game.title
    const discount = getEffectiveDiscountRate(
      overrides.discount_rate ?? game.discount_rate
    )
    const saleDiscount = discount > 0 ? `-${discount}%` : undefined

    for (const s of result.value) {
      if (seen.has(s.channelId)) continue
      seen.add(s.channelId)
      allStreams.push({
        id: hashChannelId(s.channelId),
        thumbnail: s.liveImageUrl || gameCover,
        gameCover,
        gameTitle,
        streamTitle: s.liveTitle,
        streamerName: s.channelName,
        viewers: s.concurrentUserCount,
        viewersFormatted: formatViewers(s.concurrentUserCount),
        isLive: true,
        saleDiscount,
        hasDrops: s.hasDrops ?? false,
        gameId: game.id,
        channelId: s.channelId,
      })
    }
  })

  return allStreams.sort((a: any, b: any) => b.viewers - a.viewers)
}

/* ── Fetch tag by name (slug) ── */
export async function fetchTagByName(tagName: string): Promise<TagRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .ilike("name", tagName)
    .limit(1)
  if (error || !data || data.length === 0) return null
  return data[0]
}

/* ── Fetch games by tag name ── */
export async function fetchGamesByTagName(tagName: string): Promise<GameRow[]> {
  const tag = await fetchTagByName(tagName)
  if (!tag) return []
  return fetchGamesByTagId(tag.id)
}

/* ── Search: Games by query (title OR tag name) ── */
/**
 * Search games where:
 * - game title contains query, OR
 * - any linked tag name contains query
 * Returns games with tags included.
 */
export async function searchGames(query: string): Promise<GameWithTags[]> {
  const trimmed = query?.trim()
  if (!trimmed) return []

  const supabase = await createClient()
  const gameIds = new Set<number>()

  // 1) Games where title contains query
  const { data: gamesByTitle, error: err1 } = await supabase
    .from("games")
    .select("id")
    .ilike("title", `%${trimmed}%`)

  if (!err1 && gamesByTitle) {
    gamesByTitle.forEach((g: { id: number }) => gameIds.add(g.id))
  }

  // 2) Games linked to tags whose name contains query (tags/game_tags tables)
  const { data: matchingTags, error: err2 } = await supabase
    .from("tags")
    .select("id")
    .ilike("name", `%${trimmed}%`)

  if (!err2 && matchingTags && matchingTags.length > 0) {
    const tagIds = matchingTags.map((t: { id: number }) => t.id)
    const { data: gameTagRows, error: err3 } = await supabase
      .from("game_tags")
      .select("game_id")
      .in("tag_id", tagIds)

    if (!err3 && gameTagRows) {
      gameTagRows.forEach((gt: { game_id: number }) => gameIds.add(gt.game_id))
    }
  }

  // 3) Games where top_tags array contains query (case-insensitive partial match)
  const { data: gamesWithTopTags, error: err4 } = await supabase
    .from("games")
    .select("id, top_tags")
    .not("top_tags", "is", null)

  if (!err4 && gamesWithTopTags) {
    const q = trimmed.toLowerCase()
    for (const g of gamesWithTopTags) {
      const tags = g.top_tags as string[] | null
      if (!Array.isArray(tags)) continue
      if (tags.some((t) => String(t).toLowerCase().includes(q))) {
        gameIds.add(g.id)
      }
    }
  }

  if (gameIds.size === 0) return []

  // 4) Fetch full game data with tags
  const { data: games, error: err5 } = await supabase
    .from("games")
    .select(`
      *,
      game_tags(
        tags(id, name, slug)
      )
    `)
    .in("id", [...gameIds])
    .order("title", { ascending: true })

  if (err5) {
    console.error("searchGames error:", err5.message)
    return []
  }

  return (games ?? []).map((game: any) => {
    const tags = (game.game_tags ?? [])
      .map((gt: any) => gt.tags)
      .filter((t: any) => t != null) as TagRow[]
    const { game_tags, ...gameData } = game
    return { ...gameData, tags } as GameWithTags
  })
}

/* ── Search: Streams by query and/or found game IDs (Chzzk API) ── */
/**
 * Search live streams via Chzzk API:
 * 1) searchChzzkLives(query) — 스트리머명/방송 제목/카테고리 검색
 * 2) foundGameIds가 있으면 해당 게임의 english_title로 getChzzkStreamsByCategory 추가 조회
 */
export async function searchStreams(
  query: string,
  foundGameIds: number[]
): Promise<any[]> {
  const trimmed = query?.trim()
  const hasQuery = !!trimmed
  const hasGameIds = foundGameIds.length > 0

  if (!hasQuery && !hasGameIds) return []

  const seen = new Set<string>()
  const allStreams: any[] = []

  function addStream(s: any, gameId?: number, gameMeta?: { gameCover: string; gameTitle: string; saleDiscount?: string }) {
    if (seen.has(s.channelId)) return
    seen.add(s.channelId)
    allStreams.push({
      id: hashChannelId(s.channelId),
      thumbnail: s.liveImageUrl || gameMeta?.gameCover || "",
      gameCover: gameMeta?.gameCover || "",
      gameTitle: gameMeta?.gameTitle || s.category || "",
      streamTitle: s.liveTitle,
      streamerName: s.channelName,
      viewers: s.concurrentUserCount,
      viewersFormatted: formatViewers(s.concurrentUserCount),
      isLive: true,
      saleDiscount: gameMeta?.saleDiscount,
      hasDrops: s.hasDrops ?? false,
      gameId,
      channelId: s.channelId,
    })
  }

  // 1) 키워드 기반 검색 (스트리머명, 방송 제목, 카테고리)
  if (hasQuery) {
    const results = await searchChzzkLives(trimmed, 30)
    for (const s of results) addStream(s)
  }

  // 2) foundGameIds의 게임 카테고리로 추가 조회 (최대 3개 게임)
  if (hasGameIds) {
    const supabase = await createClient()
    const { data: games } = await supabase
      .from("games")
      .select("id, title, korean_title, english_title, header_image_url, cover_image_url, discount_rate")
      .in("id", foundGameIds)
      .limit(3)

    if (games?.length) {
      const mappings = await getGameMappings()
      const eligible = games.filter((g: any) => g.english_title?.trim())
      const categoryResults = await Promise.allSettled(
        eligible.map((g: any) => getChzzkStreamsByCategory(g.english_title.trim()))
      )

      categoryResults.forEach((result, idx) => {
        if (result.status !== "fulfilled") return
        const game = eligible[idx] as any
        const mapping = resolveMapping(mappings, game.title, game.english_title, game.korean_title)
        const overrides = applyMappingOverridesToGame(game, mapping)
        const gameCover = getBestGameImage(
          overrides.header_image_url ?? game.header_image_url,
          overrides.cover_image_url ?? game.cover_image_url
        )
        const gameTitle =
          getDisplayGameTitle(overrides) ?? game.korean_title ?? game.title
        const discount = getEffectiveDiscountRate(
          overrides.discount_rate ?? game.discount_rate
        )
        const saleDiscount = discount > 0 ? `-${discount}%` : undefined

        for (const s of result.value) {
          addStream(s, game.id, { gameCover, gameTitle, saleDiscount })
        }
      })
    }
  }

  return allStreams.sort((a: any, b: any) => b.viewers - a.viewers)
}

/* ── Fetch games with active drops (드롭스 활성화 방송이 있는 게임) ── */
export interface GamesWithDropsRow {
  id: number
  title: string
  cover_image_url: string | null
  header_image_url: string | null
  totalViewers: number
}

/* ── Fetch hidden gems games (숨겨진 꿀잼 게임 - stream 5~29, viewers >= 100) ── */
export interface HiddenGemsRow {
  id: number
  title: string
  cover_image_url: string | null
  header_image_url: string | null
  totalViewers: number
  liveStreamCount: number
}

/* ── Fetch new releases (따끈따끈 신작 - 30일 이내 출시, 치지직 화제) ── */
export interface NewReleasesRow {
  id: number
  title: string
  cover_image_url: string | null
  header_image_url: string | null
  totalViewers: number
  liveStreamCount: number
  daysSinceRelease: number
}

/* ── Fetch trending games (trending_games view - trend_score 알고리즘 적용) ── */
export interface TrendingGameRow extends GameRow {
  totalViewers: number
  viewersFormatted: string
  liveStreamCount: number
  topTag?: string
}

/* ── V2: 기간별 과거 트렌딩 (daily_game_stats 기반) ── */
export type TrendingPeriod = "yesterday" | "week" | "month"

export interface HistoricalTrendingRow {
  id: number
  title: string
  cover_image_url: string | null
  header_image_url: string | null
  peak_viewers: number
  trend_score: number
  price_krw: number | null
  original_price_krw: number | null
  discount_rate: number | null
  is_free: boolean | null
  top_tags: string[] | null
}

/* ── V2: 홈 서버 컨퓨테이션용 게임 DB 데이터 ── */
export interface HomeGameRow {
  id: number
  title: string
  korean_title: string | null
  english_title: string | null
  cover_image_url: string | null
  header_image_url: string | null
  price_krw: number | null
  original_price_krw: number | null
  discount_rate: number | null
  is_free: boolean | null
  top_tags: string[] | null
  release_date: string | null
  steam_appid: number | null
}


/* ── Fetch tags by game ID ── */
export async function fetchTagsByGameId(gameId: number): Promise<TagRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("game_tags")
    .select("tags(*)")
    .eq("game_id", gameId)
  
  if (error || !data) return []
  return data
    .map((row: any) => row.tags)
    .filter((tag: any) => tag !== null)
}

/* ── Fetch streams for followed games (Chzzk API) ── */
export async function fetchStreamsForFollowedGames(gameIds: number[]) {
  if (gameIds.length === 0) return []

  const supabase = await createClient()
  const { data: games } = await supabase
    .from("games")
    .select("id, title, korean_title, english_title, header_image_url, cover_image_url, discount_rate")
    .in("id", gameIds)

  if (!games?.length) return []

  const mappings = await getGameMappings()

  // 영문 카테고리 ID가 있는 게임만 대상 (최대 10개, API 부하 제한)
  const eligible = games.filter((g: any) => g.english_title?.trim()).slice(0, 10)

  const results = await Promise.allSettled(
    eligible.map((g: any) => getChzzkStreamsByCategory(g.english_title.trim()))
  )

  const allStreams: any[] = []

  results.forEach((result, idx) => {
    if (result.status !== "fulfilled") return
    const game = eligible[idx] as any
    const mapping = resolveMapping(mappings, game.title, game.english_title, game.korean_title)
    const overrides = applyMappingOverridesToGame(game, mapping)
    const gameCover = getBestGameImage(
      overrides.header_image_url ?? game.header_image_url,
      overrides.cover_image_url ?? game.cover_image_url
    )
    const gameTitle =
      getDisplayGameTitle(overrides) ?? game.korean_title ?? game.title
    const discount = getEffectiveDiscountRate(
      overrides.discount_rate ?? game.discount_rate
    )
    const saleDiscount = discount > 0 ? `-${discount}%` : undefined

    for (const s of result.value) {
      allStreams.push({
        id: hashChannelId(s.channelId),
        thumbnail: s.liveImageUrl || gameCover,
        gameCover,
        gameTitle,
        streamTitle: s.liveTitle,
        streamerName: s.channelName,
        viewers: s.concurrentUserCount,
        viewersFormatted: formatViewers(s.concurrentUserCount),
        isLive: true,
        saleDiscount,
        hasDrops: s.hasDrops ?? false,
        gameId: game.id,
        channelId: s.channelId,
      } as any)
    }
  })

  return allStreams.sort((a: any, b: any) => b.viewers - a.viewers)
}

function hashChannelId(channelId: string): number {
  let hash = 0
  for (let i = 0; i < channelId.length; i++) {
    hash = ((hash << 5) - hash + channelId.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/**
 * 검색 결과 게임 카드용 실시간 스트림 통계.
 * getTopLiveGames() API 캐시를 활용하여 현재 방송 중인 게임의 시청자 수/방송 수를 반환합니다.
 * 방송 중이 아닌 게임은 { totalViewers: 0, liveStreamCount: 0 }을 반환합니다.
 */
export async function getStreamStatsMatchingGameDetails(
  games: { id: number; title: string; korean_title?: string | null; english_title?: string | null }[]
): Promise<Map<number, { totalViewers: number; liveStreamCount: number }>> {
  const result = new Map<number, { totalViewers: number; liveStreamCount: number }>()
  for (const g of games) result.set(g.id, { totalViewers: 0, liveStreamCount: 0 })
  if (games.length === 0) return result

  const topLive = await getTopLiveGames(100)

  function norm(s: string) {
    return s.toLowerCase().replace(/_/g, " ").trim()
  }

  // categoryId(영문) 및 title(한글) 기준 룩업 맵
  const liveByEnglish = new Map<string, typeof topLive[0]>()
  const liveByKorean = new Map<string, typeof topLive[0]>()
  for (const live of topLive) {
    liveByEnglish.set(norm(live.categoryId), live)
    liveByKorean.set(norm(live.title), live)
  }

  for (const game of games) {
    const matched =
      (game.korean_title ? liveByKorean.get(norm(game.korean_title)) : undefined) ??
      (game.english_title ? liveByEnglish.get(norm(game.english_title)) : undefined) ??
      liveByKorean.get(norm(game.title)) ??
      liveByEnglish.get(norm(game.title))

    if (matched) {
      result.set(game.id, {
        totalViewers: matched.concurrentUserCount,
        liveStreamCount: matched.openLiveCount,
      })
    }
  }

  return result
}

/* ── Get all tags (for Explore page filter) ── */
export async function getAllTags(): Promise<TagRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tags")
    .select("id, name, slug")
    .order("name")
  
  if (error) {
    console.error("getAllTags error:", error.message)
    return []
  }
  
  return data ?? []
}

/* ── Search tags from games.top_tags (for autocomplete) ── */
export async function searchTagsFromGames(query: string, limit: number = 10): Promise<string[]> {
  const supabase = await createClient()
  
  const trimmed = query?.trim()
  if (!trimmed || trimmed.length < 1) return []
  
  const { data: games, error } = await supabase
    .from("games")
    .select("top_tags")
    .not("top_tags", "is", null)
  
  if (error || !games) return []
  
  const queryLower = trimmed.toLowerCase()
  const seen = new Set<string>()
  const results: string[] = []
  
  for (const game of games) {
    const tags = game.top_tags as string[] | null
    if (!Array.isArray(tags)) continue
    
    for (const tag of tags) {
      const name = String(tag).trim()
      if (!name || seen.has(name)) continue
      if (!name.toLowerCase().includes(queryLower)) continue
      
      seen.add(name)
      results.push(name)
      if (results.length >= limit) return results
    }
  }
  
  return results
}

/* ── Get top tags from games.top_tags (게임 상세와 동일 출처, 한글 태그) ── */
async function getTopTagsFromGamesTable(limit: number): Promise<TagRow[]> {
  const supabase = await createClient()
  const { data: games, error } = await supabase
    .from("games")
    .select("top_tags")
    .not("top_tags", "is", null)
    .limit(100)

  if (error || !games?.length) return []

  const seenKeys = new Set<string>()
  const topTags: TagRow[] = []

  for (const game of games) {
    const arr = game.top_tags as string[] | null
    if (!Array.isArray(arr)) continue
    for (const tagName of arr) {
      if (topTags.length >= limit) break
      const name = String(tagName).trim()
      if (!name) continue
      const lowerName = name.toLowerCase()
      const slugBase = lowerName.replace(/\s+/g, "-")
      const slug = slugBase.replace(/[#?&=/\\]/g, "")
      const key = slug || lowerName
      if (seenKeys.has(key)) continue
      seenKeys.add(key)
      topTags.push({
        id: -(topTags.length + 1),
        name,
        slug: slug || lowerName.replace(/\s+/g, "-")
      })
    }
  }
  return topTags
}

/* ── Get top tags from games table (for Explore filter) ── */
export async function getTopGameTags(limit: number = 10): Promise<TagRow[]> {
  try {
    return (await getTopTagsFromGamesTable(limit)).slice(0, limit)
  } catch (error) {
    console.error("getTopGameTags error:", error)
    return []
  }
}

/* ── Get games by multiple tag slugs (OR condition) ── */
export async function getGamesByTags(tagSlugs: string[]): Promise<GameWithTags[]> {
  const supabase = await createClient()
  
  // If no tags selected, return empty array (or all games if preferred)
  if (!tagSlugs || tagSlugs.length === 0) {
    return []
  }
  
  // Step 1: Convert tag slugs to tag IDs
  const { data: tagData, error: tagError } = await supabase
    .from("tags")
    .select("id")
    .in("slug", tagSlugs)
  
  if (tagError || !tagData || tagData.length === 0) {
    console.error("getGamesByTags - tag lookup error:", tagError?.message)
    return []
  }
  
  const tagIds = tagData.map(t => t.id)
  
  // Step 2: Find game IDs that have any of these tags (OR condition)
  const { data: gameTagData, error: gameTagError } = await supabase
    .from("game_tags")
    .select("game_id")
    .in("tag_id", tagIds)
  
  if (gameTagError || !gameTagData || gameTagData.length === 0) {
    console.error("getGamesByTags - game_tags lookup error:", gameTagError?.message)
    return []
  }
  
  // Remove duplicate game IDs
  const gameIds = [...new Set(gameTagData.map(gt => gt.game_id))]
  
  // Step 3: Fetch game details with their tags
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select(`
      *,
      game_tags!inner(
        tags(id, name, slug)
      )
    `)
    .in("id", gameIds)
  
  if (gamesError) {
    console.error("getGamesByTags - games fetch error:", gamesError.message)
    return []
  }
  
  if (!games) return []
  
  // Step 4: Transform data to include tags array
  const gamesWithTags = games.map((game: any) => {
    const tags = game.game_tags
      .map((gt: any) => gt.tags)
      .filter((tag: any) => tag !== null) as TagRow[]
    
    // Remove game_tags from the game object
    const { game_tags, ...gameData } = game
    
    return {
      ...gameData,
      tags
    } as GameWithTags
  })
  
  return gamesWithTags
}

/* ── Get games by top_tags (AND - must contain ALL tag names) ── */
export async function getGamesByTopTagsAND(tagNames: string[]): Promise<GameWithTags[]> {
  const supabase = await createClient()
  
  if (!tagNames || tagNames.length === 0) return []
  
  // Filter games where top_tags contains all selected tag names
  // Postgres: top_tags @> ARRAY['Action','RPG'] means contains all
  const { data: games, error } = await supabase
    .from("games")
    .select("*")
    .contains("top_tags", tagNames)
  
  if (error) {
    console.error("getGamesByTopTagsAND error:", error.message)
    return []
  }
  
  if (!games?.length) return []
  
  return games.map((game: any) => ({
    ...game,
    tags: (game.top_tags ?? []).map((name: string) => ({
      id: 0,
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    }))
  })) as GameWithTags[]
}

/* ── Get games by multiple tag slugs (AND condition - must have ALL tags) ── */
export async function getGamesByTagsAND(tagSlugs: string[]): Promise<GameWithTags[]> {
  const supabase = await createClient()
  
  // If no tags selected, return empty array
  if (!tagSlugs || tagSlugs.length === 0) {
    return []
  }
  
  // Step 1: Convert tag slugs to tag IDs
  const { data: tagData, error: tagError } = await supabase
    .from("tags")
    .select("id, slug")
    .in("slug", tagSlugs)
  
  if (tagError || !tagData || tagData.length === 0) {
    console.error("getGamesByTagsAND - tag lookup error:", tagError?.message)
    return []
  }
  
  const tagIds = tagData.map(t => t.id)
  
  // If we couldn't find all requested tags, return empty
  if (tagIds.length !== tagSlugs.length) {
    return []
  }
  
  // Step 2: Get all game_tags entries for these tags
  const { data: gameTagData, error: gameTagError } = await supabase
    .from("game_tags")
    .select("game_id, tag_id")
    .in("tag_id", tagIds)
  
  if (gameTagError || !gameTagData) {
    console.error("getGamesByTagsAND - game_tags lookup error:", gameTagError?.message)
    return []
  }
  
  // Step 3: Group by game_id and count how many tags each game has
  const gameTagCounts = new Map<number, Set<number>>()
  for (const gt of gameTagData) {
    if (!gameTagCounts.has(gt.game_id)) {
      gameTagCounts.set(gt.game_id, new Set())
    }
    gameTagCounts.get(gt.game_id)!.add(gt.tag_id)
  }
  
  // Step 4: Filter games that have ALL required tags
  const gameIds = Array.from(gameTagCounts.entries())
    .filter(([_, tagSet]) => tagSet.size === tagIds.length)
    .map(([gameId, _]) => gameId)
  
  if (gameIds.length === 0) {
    return []
  }
  
  // Step 5: Fetch game details with their tags
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select(`
      *,
      game_tags!inner(
        tags(id, name, slug)
      )
    `)
    .in("id", gameIds)
  
  if (gamesError) {
    console.error("getGamesByTagsAND - games fetch error:", gamesError.message)
    return []
  }
  
  if (!games) return []
  
  // Step 6: Transform data to include tags array
  const gamesWithTags = games.map((game: any) => {
    const tags = game.game_tags
      .map((gt: any) => gt.tags)
      .filter((tag: any) => tag !== null) as TagRow[]
    
    // Remove game_tags from the game object
    const { game_tags, ...gameData } = game
    
    return {
      ...gameData,
      tags
    } as GameWithTags
  })
  
  return gamesWithTags
}

/* ── Fetch all events (game_category로 games 매칭, 날짜 필터는 프론트엔드에서) ── */
async function fetchUpcomingEventsImpl(): Promise<EventRow[]> {
  const supabase = createClientForCache()

  const { data: eventsData, error } = await supabase
    .from("events")
    .select(`
      id,
      title,
      description,
      event_type,
      start_date,
      end_date,
      game_category,
      header_image_url,
      external_url
    `)
    .order("start_date", { ascending: true })

  if (error) {
    console.error("fetchUpcomingEvents error:", error.message)
    return []
  }

  const rows = (eventsData ?? []) as Array<Record<string, unknown>>

  /* EventRow로 명시적 변환 (event_type 등 누락 방지) */
  function toEventRow(row: Record<string, unknown>, gamesPayload: EventRow["games"]): EventRow {
    return {
      id: row.id as number,
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      event_type: (row.event_type as string | null) ?? null,
      start_date: row.start_date as string,
      end_date: (row.end_date as string | null) ?? null,
      game_category: (row.game_category as string | null) ?? null,
      header_image_url: (row.header_image_url as string | null) ?? null,
      external_url: (row.external_url as string | null) ?? null,
      games: gamesPayload,
    }
  }

  const categories = [...new Set(rows.map((r) => (r.game_category as string)?.trim()).filter(Boolean))] as string[]

  if (categories.length === 0) {
    return rows.map((row) => toEventRow(row, null))
  }

  /* game_category로 games 조회 (korean_title 또는 title 매칭) */
  const orTerms = categories.flatMap((c) => [
    `korean_title.ilike.${escapePostgrestOrValue(c)}`,
    `title.ilike.${escapePostgrestOrValue(c)}`,
  ])
  const { data: gamesData } = await supabase
    .from("games")
    .select("id, title, korean_title, cover_image_url, header_image_url")
    .or(orTerms.join(","))

  const games = (gamesData ?? []) as Array<{
    id: number
    title: string
    korean_title?: string | null
    cover_image_url: string | null
    header_image_url: string | null
  }>

  const categoryToGame = new Map<string, (typeof games)[0]>()
  for (const cat of categories) {
    const match = games.find(
      (g) =>
        (g.korean_title?.trim().toLowerCase() === cat.trim().toLowerCase()) ||
        (g.title?.trim().toLowerCase() === cat.trim().toLowerCase())
    )
    if (match) categoryToGame.set(cat.trim(), match)
  }

  return rows.map((row) => {
    const gc = (row.game_category as string)?.trim()
    const gamesMatch = gc ? categoryToGame.get(gc) ?? null : null
    const gamesPayload = gamesMatch
      ? {
          id: gamesMatch.id,
          title: gamesMatch.title,
          cover_image_url: gamesMatch.cover_image_url,
          header_image_url: gamesMatch.header_image_url,
        }
      : null
    return toEventRow(row, gamesPayload)
  })
}

export async function fetchUpcomingEvents(): Promise<EventRow[]> {
  return unstable_cache(
    fetchUpcomingEventsImpl,
    ["upcoming-events"],
    { revalidate: CACHE_REVALIDATE_EVENTS, tags: ["upcoming-events"] }
  )()
}

/** Esports 채널 목록 (1개 이상 이벤트 중계하는 모든 채널, events limit 영향 없음) */
export interface EsportsChannel {
  url: string
  name: string
}

async function fetchEsportsChannelsImpl(): Promise<EsportsChannel[]> {
  const supabase = createClientForCache()
  const seen = new Map<string, string>()
  let offset = 0
  const pageSize = 1000

  while (true) {
    const { data: rows, error } = await supabase
      .from("events")
      .select("external_url, title")
      .eq("event_type", "Esports")
      .not("external_url", "is", null)
      .order("start_date", { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.error("fetchEsportsChannels error:", error.message)
      break
    }
    if (!rows?.length) break

    for (const row of rows as Array<{ external_url: string; title: string | null }>) {
      const url = row.external_url?.trim()
      if (!url) continue
      if (seen.has(url)) continue
      const match = (row.title ?? "").match(/^\[([^\]]+)\]/)
      seen.set(url, match ? match[1].trim() : url)
    }

    if (rows.length < pageSize) break
    offset += pageSize
  }

  return Array.from(seen.entries())
    .map(([url, name]) => ({ url, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchEsportsChannels(): Promise<EsportsChannel[]> {
  return unstable_cache(
    fetchEsportsChannelsImpl,
    ["esports-channels"],
    { revalidate: CACHE_REVALIDATE_EVENTS, tags: ["upcoming-events"] }
  )()
}

/* ── V2: getHistoricalTrending — daily_game_stats 기반 기간별 트렌딩 ── */
async function getHistoricalTrendingImpl(period: TrendingPeriod): Promise<HistoricalTrendingRow[]> {
  const supabase = createClientForCache()

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  let startDateStr: string
  if (period === "yesterday") {
    startDateStr = yesterdayStr
  } else if (period === "week") {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    startDateStr = d.toISOString().slice(0, 10)
  } else {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    startDateStr = d.toISOString().slice(0, 10)
  }

  const { data: stats, error: statsErr } = await supabase
    .from("daily_game_stats")
    .select("game_id, peak_viewers, trend_score")
    .gte("record_date", startDateStr)
    .lte("record_date", yesterdayStr)

  if (statsErr || !stats || stats.length === 0) return []

  // game_id별 최댓값 집계 (TypeScript)
  const gameStats = new Map<number, { peak_viewers: number; trend_score: number }>()
  for (const row of stats) {
    const gid = row.game_id as number
    const ts = (row.trend_score as number) ?? 0
    const pv = (row.peak_viewers as number) ?? 0
    const prev = gameStats.get(gid)
    if (!prev || ts > prev.trend_score) {
      gameStats.set(gid, { peak_viewers: pv, trend_score: ts })
    }
  }

  const topIds = Array.from(gameStats.entries())
    .sort((a, b) => b[1].trend_score - a[1].trend_score)
    .slice(0, 8)
    .map(([id]) => id)

  if (topIds.length === 0) return []

  const { data: games, error: gErr } = await supabase
    .from("games")
    .select("id, title, korean_title, english_title, cover_image_url, header_image_url, price_krw, original_price_krw, discount_rate, is_free, top_tags")
    .in("id", topIds)

  if (gErr || !games) return []

  const mappings = await getGameMappings()
  const gamesMap = new Map<number, any>()
  for (const g of games) {
    const m = resolveMapping(
      mappings,
      g.title ?? "",
      (g as any).english_title ?? null,
      (g as any).korean_title ?? null
    )
    gamesMap.set(g.id, applyMappingOverridesToGame(g, m))
  }

  return topIds
    .map((gameId) => {
      const g = gamesMap.get(gameId)
      if (!g) return null
      const s = gameStats.get(gameId)!
      const effectiveDiscount = getEffectiveDiscountRate(g.discount_rate)
      return {
        id: g.id,
        title: getDisplayGameTitle({ korean_title: (g as any).korean_title, title: g.title }),
        cover_image_url: g.cover_image_url,
        header_image_url: g.header_image_url ?? g.cover_image_url,
        peak_viewers: s.peak_viewers,
        trend_score: s.trend_score,
        price_krw: g.price_krw ?? null,
        original_price_krw: g.original_price_krw ?? null,
        discount_rate: effectiveDiscount > 0 ? effectiveDiscount : null,
        is_free: g.is_free ?? null,
        top_tags: Array.isArray(g.top_tags) ? g.top_tags : null,
      } as HistoricalTrendingRow
    })
    .filter((r): r is HistoricalTrendingRow => r !== null)
}

/**
 * 기간별 과거 트렌딩 게임 조회 (daily_game_stats 기반)
 * - yesterday: 어제 peak 기준
 * - week: 최근 7일 MAX(trend_score)
 * - month: 최근 30일 MAX(trend_score)
 */
export async function getHistoricalTrending(period: TrendingPeriod): Promise<HistoricalTrendingRow[]> {
  return unstable_cache(
    () => getHistoricalTrendingImpl(period),
    [`historical-trending-${period}`],
    { revalidate: 3600 } // 1시간 캐시 (과거 데이터는 하루 1회만 갱신)
  )()
}

/* ── V2: fetchAllGamesForHome — 홈 서버 컨퓨테이션용 게임 데이터 ── */
async function fetchAllGamesForHomeImpl(): Promise<HomeGameRow[]> {
  const supabase = createClientForCache()
  const { data, error } = await supabase
    .from("games")
    .select(
      "id, title, korean_title, english_title, cover_image_url, header_image_url, price_krw, original_price_krw, discount_rate, is_free, top_tags, release_date, steam_appid"
    )
    .limit(500)

  if (error || !data) {
    console.error("fetchAllGamesForHome error:", error?.message)
    return []
  }
  return data as HomeGameRow[]
}

/**
 * 홈 페이지 서버 컨퓨테이션용 게임 데이터 일괄 조회
 * - 실시간 트렌딩 DB 매칭, 숨겨진 꿀잼, 신작 계산에 사용
 * - 5분 캐시 (게임 메타데이터 변경 빈도 낮음)
 */
export async function fetchAllGamesForHome(): Promise<HomeGameRow[]> {
  return unstable_cache(
    fetchAllGamesForHomeImpl,
    ["all-games-for-home"],
    { revalidate: 300 }
  )()
}

/* ── V2: getGamesByTrendScore — 태그 필터 지원 트렌드 점수 순 게임 조회 ── */
async function getGamesByTrendScoreImpl(tagName?: string): Promise<HistoricalTrendingRow[]> {
  const supabase = createClientForCache()

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const startDate = sevenDaysAgo.toISOString().slice(0, 10)

  const { data: stats } = await supabase
    .from("daily_game_stats")
    .select("game_id, trend_score, peak_viewers")
    .gte("record_date", startDate)

  const trendMap = new Map<number, { trend_score: number; peak_viewers: number }>()
  for (const row of stats ?? []) {
    const id = row.game_id as number
    const ts = (row.trend_score as number) ?? 0
    const pv = (row.peak_viewers as number) ?? 0
    const prev = trendMap.get(id)
    if (!prev || ts > prev.trend_score) trendMap.set(id, { trend_score: ts, peak_viewers: pv })
  }

  const baseQuery = supabase
    .from("games")
    .select("id, title, korean_title, english_title, cover_image_url, header_image_url, price_krw, original_price_krw, discount_rate, is_free, top_tags")
    .limit(500)

  const { data: games } = tagName
    ? await baseQuery.contains("top_tags", [tagName])
    : await baseQuery

  if (!games) return []

  const mappings = await getGameMappings()

  return games
    .map((g: any) => {
      const s = trendMap.get(g.id as number)
      const m = resolveMapping(mappings, g.title ?? "", g.english_title ?? null, g.korean_title ?? null)
      const mg = applyMappingOverridesToGame(g, m) as any
      const effectiveDiscount = getEffectiveDiscountRate(mg.discount_rate)
      return {
        id: mg.id,
        title: getDisplayGameTitle({ korean_title: mg.korean_title, title: mg.title }),
        cover_image_url: mg.cover_image_url,
        header_image_url: mg.header_image_url ?? mg.cover_image_url,
        peak_viewers: s?.peak_viewers ?? 0,
        trend_score: s?.trend_score ?? 0,
        price_krw: mg.price_krw ?? null,
        original_price_krw: mg.original_price_krw ?? null,
        discount_rate: effectiveDiscount > 0 ? effectiveDiscount : null,
        is_free: mg.is_free ?? null,
        top_tags: Array.isArray(mg.top_tags) ? mg.top_tags : null,
      } as HistoricalTrendingRow
    })
    .sort((a, b) => b.trend_score - a.trend_score)
}

/**
 * 트렌드 점수 기준 게임 목록 조회 (선택적 태그 필터)
 * - tagName 지정 시 해당 태그를 가진 게임만 반환
 * - 최근 7일 daily_game_stats 기반 trend_score 내림차순 정렬
 * - trend_score 없는 게임도 포함 (score=0으로 후순위 배치)
 */
export async function getGamesByTrendScore(tagName?: string): Promise<HistoricalTrendingRow[]> {
  return unstable_cache(
    () => getGamesByTrendScoreImpl(tagName),
    [`games-by-trend-score-${tagName ?? "all"}`],
    { revalidate: 300 }
  )()
}

