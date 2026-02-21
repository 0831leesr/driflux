"use server"

import { createClient } from "@/lib/supabase/server"
import type { EventRow } from "@/lib/types"
import { getBestGameImage, getDisplayGameTitle } from "@/lib/utils"

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
  steam_appid: number | null
  cover_image_url: string | null
  header_image_url?: string | null
  background_image_url?: string | null
  discount_rate: number | null
  price_krw?: number | null
  original_price_krw?: number | null
  currency?: string | null
  is_free?: boolean | null
  last_steam_update?: string | null
  top_tags?: string[] | null
  short_description?: string | null
  developer?: string | null
  publisher?: string | null
}

export interface StreamRow {
  id: number
  game_id: number | null
  title: string | null
  streamer_name: string | null
  viewer_count: number | null
  thumbnail_url: string | null
  is_live: boolean
  stream_category: string | null
  chzzk_channel_id: string | null
  last_chzzk_update: string | null
  games?: GameRow
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

/* ── Fetch live streams with game info ── */
/** @param limit - 개수 (undefined면 전체) */
/** @param offset - 건너뛸 개수 (기본 0), pagination용 */
export async function fetchLiveStreams(limit?: number, offset: number = 0) {
  const supabase = await createClient()
  let query = supabase
    .from("streams")
    .select(`
      *,
      games(*)
    `)
    .eq("is_live", true)
    .order("viewer_count", { ascending: false })
  if (limit != null) {
    query = query.range(offset, offset + limit - 1)
  }
  const { data, error } = await query
  if (error) {
    console.error("fetchLiveStreams error:", error.message)
    return []
  }
  return (data ?? []).map((s: StreamRow) => ({
    id: s.id,
    thumbnail: s.thumbnail_url ?? "/streams/stream-1.jpg",
    gameCover: getBestGameImage(s.games?.header_image_url, s.games?.cover_image_url),
    // Priority: stream_category (치지직) > game title > "Unknown"
    gameTitle: s.stream_category || getDisplayGameTitle(s.games ?? {}),
    streamTitle: s.title ?? "Untitled Stream",
    streamerName: s.streamer_name ?? "Anonymous",
    viewers: s.viewer_count ?? 0,
    viewersFormatted: formatViewers(s.viewer_count),
    isLive: s.is_live,
    saleDiscount: s.games?.discount_rate && s.games.discount_rate > 0
      ? `-${s.games.discount_rate}%`
      : undefined,
    gameId: s.game_id ?? undefined,
    channelId: s.chzzk_channel_id ?? undefined,
    // Original data for reference
    rawData: {
      streamCategory: s.stream_category,
      gameData: s.games,
    }
  }))
}

/* ── Fetch games that are on sale with their top stream ── */
export async function fetchSaleGames() {
  const supabase = await createClient()
  const { data: games, error } = await supabase
    .from("games")
    .select("*")
    .gt("discount_rate", 0)
    .order("discount_rate", { ascending: false })
    .limit(12) // Limit to top 12 sale games
  if (error) {
    console.error("fetchSaleGames error:", error.message)
    return []
  }
  if (!games || games.length === 0) return []

  const results = []
  for (const game of games) {
    const { data: streams } = await supabase
      .from("streams")
      .select("*")
      .eq("game_id", game.id)
      .eq("is_live", true)
      .order("viewer_count", { ascending: false })
      .limit(1)
    const topStream = streams?.[0]
    const topTags = Array.isArray(game.top_tags) ? game.top_tags : []
    const topTag = topTags.length > 0 ? topTags[0] : undefined
    results.push({
      // Stream data
      thumbnail: topStream?.thumbnail_url ?? "/streams/stream-1.jpg",
      gameCover: getBestGameImage(game.header_image_url, game.cover_image_url),
      gameTitle: getDisplayGameTitle(game),
      streamerName: topStream?.streamer_name ?? "N/A",
      viewers: formatViewers(topStream?.viewer_count ?? 0),
      discount: `-${game.discount_rate}% OFF`,
      // Game data (for compatibility with game cards)
      id: game.id,
      title: getDisplayGameTitle(game),
      cover_image_url: game.cover_image_url,
      header_image_url: game.header_image_url,
      price_krw: game.price_krw,
      original_price_krw: game.original_price_krw,
      discount_rate: game.discount_rate,
      is_free: game.is_free,
      topTag,
    })
  }
  return results
}

/* ── Fetch streams for a specific game (by title) ── */
export async function fetchStreamsByGameTitle(gameTitle: string) {
  const supabase = await createClient()
  const { data: games } = await supabase
    .from("games")
    .select("*")
    .ilike("title", gameTitle)
    .limit(1)
  if (!games || games.length === 0) return []
  const game = games[0]

  const { data: streams, error } = await supabase
    .from("streams")
    .select("*")
    .eq("game_id", game.id)
    .order("viewer_count", { ascending: false })
  if (error) return []
  return (streams ?? []).map((s: StreamRow) => ({
    id: s.id,
    thumbnail: s.thumbnail_url ?? "/streams/stream-1.jpg",
    gameCover: getBestGameImage(game.header_image_url, game.cover_image_url),
    gameTitle: s.stream_category || getDisplayGameTitle(game),
    streamTitle: s.title ?? "Untitled Stream",
    streamerName: s.streamer_name ?? "Anonymous",
    viewers: s.viewer_count ?? 0,
    viewersFormatted: formatViewers(s.viewer_count),
    isLive: s.is_live,
    saleDiscount: game.discount_rate && game.discount_rate > 0
      ? `-${game.discount_rate}%`
      : undefined,
    channelId: s.chzzk_channel_id ?? undefined,
  }))
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
  return data[0]
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
  
  // Preserve the order of the input IDs
  const gameMap = new Map(data?.map(game => [game.id, game]) ?? [])
  return ids.map(id => gameMap.get(id)).filter((game): game is GameRow => game !== undefined)
}

/* ── Fetch streams by game ID ── */
export async function fetchStreamsByGameId(gameId: number) {
  const supabase = await createClient()
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .limit(1)
  
  if (gameError || !game || game.length === 0) {
    return []
  }
  const gameData = game[0]

  // First, try to fetch streams with matching game_id
  const { data: streamsByGameId, error: error1 } = await supabase
    .from("streams")
    .select("*")
    .eq("game_id", gameId)
    .order("viewer_count", { ascending: false })
  
  // Also fetch streams where stream_category matches game (korean_title 우선, 치지직은 한글)
  // Fallback for CHZZK streams that might not have game_id set
  const matchTerms = [
    (gameData as { korean_title?: string | null }).korean_title?.trim(),
    gameData.title?.trim(),
  ].filter((t): t is string => !!t)
  let streamsByCategory: StreamRow[] = []
  let error2: { message: string } | null = null
  if (matchTerms.length > 0) {
    const res = await supabase
      .from("streams")
      .select("*")
      .or(matchTerms.map((t) => `stream_category.ilike.${t}`).join(","))
      .order("viewer_count", { ascending: false })
    streamsByCategory = (res.data ?? []) as StreamRow[]
    error2 = res.error
  }

  if (error1 || error2) {
    console.error('[fetchStreamsByGameId] Error fetching streams:', error1?.message || error2?.message)
    return []
  }
  
  // Merge results, avoiding duplicates
  const streamIds = new Set<number>()
  const allStreams: StreamRow[] = []
  
  for (const stream of [...(streamsByGameId ?? []), ...(streamsByCategory ?? [])]) {
    if (!streamIds.has(stream.id)) {
      streamIds.add(stream.id)
      allStreams.push(stream)
    }
  }
  
  // Sort by viewer count
  allStreams.sort((a, b) => (b.viewer_count ?? 0) - (a.viewer_count ?? 0))
  
  return allStreams.map((s: StreamRow) => ({
    id: s.id,
    thumbnail: s.thumbnail_url ?? "/streams/stream-1.jpg",
    gameCover: getBestGameImage(gameData.header_image_url, gameData.cover_image_url),
    gameTitle: s.stream_category || getDisplayGameTitle(gameData as { korean_title?: string | null; title?: string | null }),
    streamTitle: s.title ?? "Untitled Stream",
    streamerName: s.streamer_name ?? "Anonymous",
    viewers: s.viewer_count ?? 0,
    viewersFormatted: formatViewers(s.viewer_count),
    isLive: s.is_live,
    saleDiscount: gameData.discount_rate && gameData.discount_rate > 0
      ? `-${gameData.discount_rate}%`
      : undefined,
    gameId: gameId,
    channelId: s.chzzk_channel_id ?? undefined,
  }))
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

/* ── Fetch streams by tag ID ── */
export async function fetchStreamsByTagId(tagId: number) {
  const supabase = await createClient()
  const { data: gameTagData, error: tagError } = await supabase
    .from("game_tags")
    .select("game_id")
    .eq("tag_id", tagId)
  if (tagError || !gameTagData || gameTagData.length === 0) return []
  const gameIds = gameTagData.map((gt: any) => gt.game_id)

  const { data: streams, error } = await supabase
    .from("streams")
    .select("*, games(*)")
    .in("game_id", gameIds)
    .eq("is_live", true)
    .order("viewer_count", { ascending: false })
  if (error) return []
  return (streams ?? []).map((s: any) => ({
    id: s.id,
    thumbnail: s.thumbnail_url ?? "/streams/stream-1.jpg",
    gameCover: getBestGameImage(s.games?.header_image_url, s.games?.cover_image_url),
    gameTitle: s.stream_category || getDisplayGameTitle(s.games ?? {}),
    streamTitle: s.title ?? "Untitled Stream",
    streamerName: s.streamer_name ?? "Anonymous",
    viewers: s.viewer_count ?? 0,
    viewersFormatted: formatViewers(s.viewer_count),
    isLive: s.is_live,
    gameId: s.game_id ?? undefined,
    channelId: s.chzzk_channel_id ?? undefined,
  }))
}

/* ── Fetch streams by tag name (using top_tags) ── */
export async function fetchStreamsByTopTag(tagName: string) {
  const supabase = await createClient()
  
  // Find games with this tag in top_tags array
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("id")
    .contains("top_tags", [tagName])
  
  if (gamesError || !games || games.length === 0) return []
  const gameIds = games.map(g => g.id)
  
  // Fetch live streams for these games
  const { data: streams, error } = await supabase
    .from("streams")
    .select("*, games(*)")
    .in("game_id", gameIds)
    .eq("is_live", true)
    .order("viewer_count", { ascending: false })
  
  if (error) return []
  return (streams ?? []).map((s: any) => ({
    id: s.id,
    thumbnail: s.thumbnail_url ?? "/streams/stream-1.jpg",
    gameCover: getBestGameImage(s.games?.header_image_url, s.games?.cover_image_url),
    gameTitle: s.stream_category || getDisplayGameTitle(s.games ?? {}),
    streamTitle: s.title ?? "Untitled Stream",
    streamerName: s.streamer_name ?? "Anonymous",
    viewers: s.viewer_count ?? 0,
    viewersFormatted: formatViewers(s.viewer_count),
    isLive: s.is_live,
    gameId: s.game_id ?? undefined,
    channelId: s.chzzk_channel_id ?? undefined,
  }))
}

/* ── Fetch streams for followed tags ── */
export async function fetchStreamsForFollowedTags(tagNames: string[]) {
  if (tagNames.length === 0) return []
  
  const supabase = await createClient()
  
  // Find all games that have any of the followed tags
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("id")
    .or(tagNames.map(tag => `top_tags.cs.{${tag}}`).join(','))
  
  if (gamesError || !games || games.length === 0) return []
  const gameIds = games.map(g => g.id)
  
  // Fetch live streams for these games
  const { data: streams, error } = await supabase
    .from("streams")
    .select("*, games(*)")
    .in("game_id", gameIds)
    .eq("is_live", true)
    .order("viewer_count", { ascending: false })
  
  if (error) {
    console.error("fetchStreamsForFollowedTags error:", error.message)
    return []
  }
  
  return (streams ?? []).map((s: any) => ({
    id: s.id,
    thumbnail: s.thumbnail_url ?? "/streams/stream-1.jpg",
    gameCover: getBestGameImage(s.games?.header_image_url, s.games?.cover_image_url),
    gameTitle: s.stream_category || getDisplayGameTitle(s.games ?? {}),
    streamTitle: s.title ?? "Untitled Stream",
    streamerName: s.streamer_name ?? "Anonymous",
    viewers: s.viewer_count ?? 0,
    viewersFormatted: formatViewers(s.viewer_count),
    isLive: s.is_live,
    gameId: s.game_id ?? undefined,
    channelId: s.chzzk_channel_id ?? undefined,
  }))
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

/* ── Fetch streams by tag name ── */
export async function fetchStreamsByTagName(tagName: string) {
  const tag = await fetchTagByName(tagName)
  if (!tag) return []
  return fetchStreamsByTagId(tag.id)
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

/* ── Search: Streams by query and/or found game IDs ── */
/**
 * Search live streams where:
 * 1) streamer_name contains query, OR
 * 2) game_id is in foundGameIds (playing a matching game)
 */
export async function searchStreams(
  query: string,
  foundGameIds: number[]
): Promise<ReturnType<typeof formatStreamForDisplay>[]> {
  const supabase = await createClient()
  const trimmed = query?.trim()
  const hasQuery = !!trimmed
  const hasGameIds = foundGameIds.length > 0

  if (!hasQuery && !hasGameIds) return []

  let streamsByStreamer: any[] = []
  let streamsByGame: any[] = []

  // 1) Streams where streamer_name contains query
  if (hasQuery) {
    const { data, error } = await supabase
      .from("streams")
      .select("*, games(*)")
      .ilike("streamer_name", `%${trimmed}%`)
      .eq("is_live", true)
      .order("viewer_count", { ascending: false })

    if (!error && data) streamsByStreamer = data
  }

  // 2) Streams where game_id is in foundGameIds
  if (hasGameIds) {
    const { data, error } = await supabase
      .from("streams")
      .select("*, games(*)")
      .in("game_id", foundGameIds)
      .eq("is_live", true)
      .order("viewer_count", { ascending: false })

    if (!error && data) streamsByGame = data
  }

  // Merge and deduplicate by stream id
  const seen = new Set<number>()
  const merged: any[] = []
  for (const s of [...streamsByStreamer, ...streamsByGame]) {
    if (!seen.has(s.id)) {
      seen.add(s.id)
      merged.push(s)
    }
  }
  merged.sort((a, b) => (b.viewer_count ?? 0) - (a.viewer_count ?? 0))

  return merged.map((s: any) => formatStreamForDisplay(s))
}

function formatStreamForDisplay(s: any) {
  return {
    id: s.id,
    thumbnail: s.thumbnail_url ?? "/streams/stream-1.jpg",
    gameCover: getBestGameImage(s.games?.header_image_url, s.games?.cover_image_url),
    gameTitle: s.stream_category || getDisplayGameTitle(s.games ?? {}),
    streamTitle: s.title ?? "Untitled Stream",
    streamerName: s.streamer_name ?? "Anonymous",
    viewers: s.viewer_count ?? 0,
    viewersFormatted: formatViewers(s.viewer_count),
    isLive: s.is_live,
    saleDiscount:
      s.games?.discount_rate && s.games.discount_rate > 0
        ? `-${s.games.discount_rate}%`
        : undefined,
    gameId: s.game_id ?? undefined,
  }
}

/* ── Fetch trending games (trending_games view - trend_score 알고리즘 적용) ── */
export interface TrendingGameRow extends GameRow {
  totalViewers: number
  viewersFormatted: string
  liveStreamCount: number
  topTag?: string
}

export interface TrendingGamesViewRow {
  title: string
  korean_title?: string | null
  cover_image_url: string | null
  stream_count: number
  total_viewers: number
  trend_score: number
}

export async function fetchTrendingGames(): Promise<TrendingGameRow[]> {
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from("trending_games")
    .select("title, korean_title, cover_image_url, stream_count, total_viewers, trend_score")
    .order("trend_score", { ascending: false })
    .limit(8)

  if (error) {
    console.error("fetchTrendingGames error:", error.message)
    return []
  }

  if (!rows || rows.length === 0) return []

  // trending_games: korean_title 우선 사용 (통일성), games는 korean_title로 매칭
  const koreanTitles = [
    ...new Set(
      (rows as TrendingGamesViewRow[])
        .map((r) => (r.korean_title ?? r.title)?.trim())
        .filter((t): t is string => !!t)
    ),
  ]
  const { data: games } = await supabase
    .from("games")
    .select("id, title, korean_title, top_tags, price_krw, original_price_krw, discount_rate, is_free, steam_appid")
    .in("korean_title", koreanTitles)
  type GameWithPrice = {
    id: number
    title: string
    korean_title: string | null
    top_tags: string[] | null
    price_krw: number | null
    original_price_krw: number | null
    discount_rate: number | null
    is_free: boolean | null
    steam_appid: number | null
  }
  const titleToGame = new Map<string, GameWithPrice>()
  const gamesWithTitle: { id: number; title: string }[] = []
  for (const g of games ?? []) {
    const key = String((g as { korean_title?: string | null }).korean_title ?? g.title).trim()
    if (!key) continue
    const gg = g as GameWithPrice
    titleToGame.set(key, {
      id: gg.id,
      title: gg.title,
      korean_title: gg.korean_title ?? null,
      top_tags: gg.top_tags ?? null,
      price_krw: gg.price_krw ?? null,
      original_price_krw: gg.original_price_krw ?? null,
      discount_rate: gg.discount_rate ?? null,
      is_free: gg.is_free ?? null,
      steam_appid: gg.steam_appid ?? null,
    })
    gamesWithTitle.push({ id: gg.id, title: gg.title })
  }

  // 게임 상세 페이지와 동일한 로직으로 스트림 통계 산출 (game_id + stream_category)
  const streamStats = await getStreamStatsMatchingGameDetails(gamesWithTitle)

  return (rows as TrendingGamesViewRow[])
    .filter((row) => {
      const key = (row.korean_title ?? row.title)?.trim()
      return key ? titleToGame.has(key) : false
    })
    .map((row) => {
      const key = (row.korean_title ?? row.title)?.trim()!
      const gameData = titleToGame.get(key)!
      const stats = streamStats.get(gameData.id) ?? { totalViewers: 0, liveStreamCount: 0 }
      const topTags = Array.isArray(gameData.top_tags) ? gameData.top_tags : null
      const topTag = topTags && topTags.length > 0 ? topTags[0] : undefined
      const displayTitle = getDisplayGameTitle({ korean_title: gameData.korean_title, title: gameData.title })
      return {
        id: gameData.id,
        title: displayTitle,
        cover_image_url: row.cover_image_url,
        header_image_url: row.cover_image_url,
        steam_appid: gameData.steam_appid,
        discount_rate: gameData.discount_rate,
        price_krw: gameData.price_krw,
        original_price_krw: gameData.original_price_krw,
        currency: null,
        is_free: gameData.is_free,
        top_tags: topTags,
        short_description: null,
        developer: null,
        publisher: null,
        background_image_url: null,
        totalViewers: stats.totalViewers,
        viewersFormatted: formatViewers(stats.totalViewers),
        liveStreamCount: stats.liveStreamCount,
        topTag,
      }
    }) as TrendingGameRow[]
}

/* ── Fetch games by viewer count (시청자 수 순, trend_score 아님) ── */
/** @param limit - 개수 (기본 50) */
/** @param offset - 건너뛸 개수 (기본 0), pagination용 */
export async function fetchGamesByViewerCount(limit: number = 50, offset: number = 0): Promise<TrendingGameRow[]> {
  const supabase = await createClient()

  const selectCols = "title, korean_title, cover_image_url, stream_count, total_viewers, trend_score"
  const { data: rows, error } = await supabase
    .from("trending_games")
    .select(selectCols)
    .order("total_viewers", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error("fetchGamesByViewerCount error:", error.message)
    return []
  }

  if (!rows || rows.length === 0) return []

  const koreanTitles = [
    ...new Set(
      (rows as TrendingGamesViewRow[])
        .map((r) => (r.korean_title ?? r.title)?.trim())
        .filter((t): t is string => !!t)
    ),
  ]
  const { data: games } = await supabase
    .from("games")
    .select("id, title, korean_title, top_tags, price_krw, original_price_krw, discount_rate, is_free, steam_appid")
    .in("korean_title", koreanTitles)
  type GameWithPrice = {
    id: number
    title: string
    korean_title: string | null
    top_tags: string[] | null
    price_krw: number | null
    original_price_krw: number | null
    discount_rate: number | null
    is_free: boolean | null
    steam_appid: number | null
  }
  const titleToGame = new Map<string, GameWithPrice>()
  const gamesWithTitle: { id: number; title: string }[] = []
  for (const g of games ?? []) {
    const key = String((g as { korean_title?: string | null }).korean_title ?? g.title).trim()
    if (!key) continue
    const gg = g as GameWithPrice
    titleToGame.set(key, gg)
    gamesWithTitle.push({ id: gg.id, title: gg.title })
  }

  const streamStats = await getStreamStatsMatchingGameDetails(gamesWithTitle)

  return (rows as TrendingGamesViewRow[])
    .filter((row) => {
      const key = (row.korean_title ?? row.title)?.trim()
      return key ? titleToGame.has(key) : false
    })
    .map((row) => {
      const key = (row.korean_title ?? row.title)?.trim()!
      const gameData = titleToGame.get(key)!
      const stats = streamStats.get(gameData.id) ?? { totalViewers: 0, liveStreamCount: 0 }
      const topTags = Array.isArray(gameData.top_tags) ? gameData.top_tags : null
      const topTag = topTags && topTags.length > 0 ? topTags[0] : undefined
      const displayTitle = getDisplayGameTitle({ korean_title: gameData.korean_title, title: gameData.title })
      return {
        id: gameData.id,
        title: displayTitle,
        cover_image_url: row.cover_image_url,
        header_image_url: row.cover_image_url,
        steam_appid: gameData.steam_appid ?? undefined,
        discount_rate: gameData.discount_rate ?? null,
        price_krw: gameData.price_krw ?? null,
        original_price_krw: gameData.original_price_krw ?? null,
        currency: null,
        is_free: gameData.is_free ?? null,
        top_tags: topTags,
        short_description: null,
        developer: null,
        publisher: null,
        background_image_url: null,
        totalViewers: stats.totalViewers,
        viewersFormatted: formatViewers(stats.totalViewers),
        liveStreamCount: stats.liveStreamCount,
        topTag,
      }
    }) as TrendingGameRow[]
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

/* ── Fetch streams for followed games ── */
export async function fetchStreamsForFollowedGames(gameIds: number[]) {
  if (gameIds.length === 0) return []
  
  const supabase = await createClient()
  const { data: streams, error } = await supabase
    .from("streams")
    .select("*, games(*)")
    .in("game_id", gameIds)
    .eq("is_live", true)
    .order("viewer_count", { ascending: false })
  
  if (error) {
    console.error("fetchStreamsForFollowedGames error:", error.message)
    return []
  }
  
  return (streams ?? []).map((s: any) => ({
    id: s.id,
    thumbnail: s.thumbnail_url ?? "/streams/stream-1.jpg",
    gameCover: getBestGameImage(s.games?.header_image_url, s.games?.cover_image_url),
    gameTitle: s.stream_category || getDisplayGameTitle(s.games ?? {}),
    streamTitle: s.title ?? "Untitled Stream",
    streamerName: s.streamer_name ?? "Anonymous",
    viewers: s.viewer_count ?? 0,
    viewersFormatted: formatViewers(s.viewer_count),
    isLive: s.is_live,
    saleDiscount: s.games?.discount_rate && s.games.discount_rate > 0
      ? `-${s.games.discount_rate}%`
      : undefined,
    gameId: s.game_id,
    channelId: s.chzzk_channel_id ?? undefined,
  }))
}

/* ── Get stream stats (viewer count, live count) for game IDs ── */
export async function getStreamStatsForGameIds(
  gameIds: number[]
): Promise<Map<number, { totalViewers: number; liveStreamCount: number }>> {
  if (gameIds.length === 0) return new Map()

  const supabase = await createClient()
  const { data: streams, error } = await supabase
    .from("streams")
    .select("game_id, viewer_count")
    .in("game_id", gameIds)
    .eq("is_live", true)

  if (error) return new Map()

  const stats = new Map<number, { totalViewers: number; liveStreamCount: number }>()
  for (const s of streams ?? []) {
    if (!s.game_id) continue
    const cur = stats.get(s.game_id) || { totalViewers: 0, liveStreamCount: 0 }
    stats.set(s.game_id, {
      totalViewers: cur.totalViewers + (s.viewer_count || 0),
      liveStreamCount: cur.liveStreamCount + 1,
    })
  }
  return stats
}

/**
 * 게임 상세 페이지(fetchStreamsByGameId)와 동일한 로직으로 스트림 통계 계산.
 * game_id 매칭 + stream_category(게임 제목) 매칭 모두 포함.
 * 게임 카드에서 게임 상세 페이지와 일치하는 스트리밍 수/시청자 수를 표시하기 위함.
 */
export async function getStreamStatsMatchingGameDetails(
  games: { id: number; title: string }[]
): Promise<Map<number, { totalViewers: number; liveStreamCount: number }>> {
  const result = new Map<number, { totalViewers: number; liveStreamCount: number }>()
  for (const g of games) result.set(g.id, { totalViewers: 0, liveStreamCount: 0 })
  if (games.length === 0) return result

  for (const game of games) {
    const streams = await fetchStreamsByGameId(game.id)
    const totalViewers = streams.reduce((sum, s) => sum + (s.viewers ?? 0), 0)
    result.set(game.id, { totalViewers, liveStreamCount: streams.length })
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

/* ── Get top tags from trending games (for Explore filter) ── */
/* Uses top_tags from games table - same source as game detail (Korean) */
export async function getTopGameTags(limit: number = 10): Promise<TagRow[]> {
  try {
    const trendingGames = await fetchTrendingGames()
    
    if (trendingGames.length === 0) {
      return (await getTopTagsFromGamesTable(limit)).slice(0, limit)
    }
    
    const seenKeys = new Set<string>()
    const topTags: TagRow[] = []
    
    for (const game of trendingGames) {
      if (topTags.length >= limit) break
      
      const topTagsArr = (game as any).top_tags as string[] | null | undefined
      if (!Array.isArray(topTagsArr)) continue
      
      for (const tagName of topTagsArr) {
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
    
    if (topTags.length > 0) return topTags
    
    return (await getTopTagsFromGamesTable(limit)).slice(0, limit)
  } catch (error) {
    console.error("getTopGameTags error:", error)
    return (await getTopTagsFromGamesTable(limit)).slice(0, limit)
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

/* ── Fetch upcoming events (start_date >= today, with optional game join) ── */
export async function fetchUpcomingEvents(): Promise<EventRow[]> {
  const supabase = await createClient()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayISO = todayStart.toISOString()

  const { data, error } = await supabase
    .from("events")
    .select(`
      id,
      title,
      description,
      event_type,
      start_date,
      end_date,
      game_id,
      external_url,
      games (
        id,
        title,
        cover_image_url,
        header_image_url
      )
    `)
    .gte("start_date", todayISO)
    .order("start_date", { ascending: true })

  if (error) {
    console.error("fetchUpcomingEvents error:", error.message)
    return []
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>
  return rows.map((row) => {
    const g = row.games
    const games =
      g == null ? null : Array.isArray(g) ? (g[0] ?? null) : g
    return { ...row, games } as EventRow
  })
}

/* ── Get streams for specific games ── */
export async function getStreamsForGames(gameIds: number[]) {
  if (gameIds.length === 0) return []
  
  const supabase = await createClient()
  const { data: streams, error } = await supabase
    .from("streams")
    .select("*, games(*)")
    .in("game_id", gameIds)
    .eq("is_live", true)
    .order("viewer_count", { ascending: false })
  
  if (error) {
    console.error("getStreamsForGames error:", error.message)
    return []
  }
  
  return (streams ?? []).map((s: any) => ({
    id: s.id,
    thumbnail: s.thumbnail_url ?? "/streams/stream-1.jpg",
    gameCover: getBestGameImage(s.games?.header_image_url, s.games?.cover_image_url),
    gameTitle: s.stream_category || getDisplayGameTitle(s.games ?? {}),
    streamTitle: s.title ?? "Untitled Stream",
    streamerName: s.streamer_name ?? "Anonymous",
    viewers: s.viewer_count ?? 0,
    viewersFormatted: formatViewers(s.viewer_count),
    isLive: s.is_live,
    saleDiscount: s.games?.discount_rate && s.games.discount_rate > 0
      ? `-${s.games.discount_rate}%`
      : undefined,
    gameId: s.game_id,
    channelId: s.chzzk_channel_id ?? undefined,
    rawData: { streamCategory: s.stream_category, gameData: s.games },
  }))
}
