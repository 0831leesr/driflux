/**
 * Chzzk TopLive + DB 게임 매칭 (동기 유틸 — "use server" 모듈에서 분리)
 */
import type { TopLiveGame } from "@/lib/chzzk"
import {
  escapePostgrestOrValue,
  getDisplayGameTitle,
  getEffectiveDiscountRate,
} from "@/lib/utils"
import { fetchAllGamesForHome, type TrendingGameRow, type HomeGameRow } from "@/lib/data"
import { createClientForCache } from "@/lib/supabase/server"
import { getGameMappings, resolveMapping } from "@/lib/mappings"

const HOME_GAME_SELECT =
  "id, slug, title, korean_title, english_title, cover_image_url, header_image_url, price_krw, original_price_krw, discount_rate, is_free, top_tags, release_date, steam_appid"

/** 공백·언더스코어 제거 + 소문자 — 표기 차이 완화 */
function compactLookupKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "")
    .trim()
}

async function fetchSupplementGamesBySteamAppIds(steamIds: number[]): Promise<HomeGameRow[]> {
  if (steamIds.length === 0) return []
  const supabase = createClientForCache()
  const { data, error } = await supabase.from("games").select(HOME_GAME_SELECT).in("steam_appid", steamIds)
  if (error || !data) {
    console.error("[TopLiveMatch] fetchSupplementGamesBySteamAppIds:", error?.message)
    return []
  }
  return data as HomeGameRow[]
}

async function fetchSupplementGamesByExactTitlesSplitQueries(
  supabase: ReturnType<typeof createClientForCache>,
  uniq: string[],
): Promise<HomeGameRow[]> {
  const byId = new Map<number, HomeGameRow>()
  for (const col of ["korean_title", "english_title", "title"] as const) {
    const { data, error } = await supabase.from("games").select(HOME_GAME_SELECT).in(col, uniq)
    if (error) continue
    for (const row of data ?? []) {
      const g = row as HomeGameRow
      if (!byId.has(g.id)) byId.set(g.id, g)
    }
  }
  return [...byId.values()]
}

async function fetchSupplementGamesByExactTitles(titles: string[]): Promise<HomeGameRow[]> {
  const uniq = [...new Set(titles.map((t) => t.trim()).filter((t) => t.length > 0))]
  if (uniq.length === 0) return []
  const supabase = createClientForCache()
  const inList = uniq.map(escapePostgrestOrValue).join(",")
  const orFilter = `korean_title.in.(${inList}),english_title.in.(${inList}),title.in.(${inList})`
  const { data, error } = await supabase.from("games").select(HOME_GAME_SELECT).or(orFilter)
  if (error) {
    console.warn("[TopLiveMatch] fetchSupplementGamesByExactTitles .or fallback:", error.message)
    return fetchSupplementGamesByExactTitlesSplitQueries(supabase, uniq)
  }
  const byId = new Map<number, HomeGameRow>()
  for (const row of data ?? []) {
    const g = row as HomeGameRow
    if (!byId.has(g.id)) byId.set(g.id, g)
  }
  return [...byId.values()]
}

function formatViewers(count: number | null): string {
  if (!count) return "0"
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return String(count)
}

/** Chzzk TopLive ↔ games 홈 행 매칭용 맵 (한 번만 생성) */
export type TopLiveHomeLookupMaps = {
  byKorean: Map<string, HomeGameRow>
  byEnglish: Map<string, HomeGameRow>
}

export function buildTopLiveHomeLookupMaps(dbGames: HomeGameRow[]): TopLiveHomeLookupMaps {
  const byKorean = new Map<string, HomeGameRow>()
  const byEnglish = new Map<string, HomeGameRow>()

  for (const g of dbGames) {
    if (g.korean_title) {
      const k = g.korean_title.toLowerCase().trim()
      byKorean.set(k, g)
      byKorean.set(compactLookupKey(g.korean_title), g)
    }
    if (g.english_title) {
      const e = g.english_title.toLowerCase().trim()
      byEnglish.set(e.replace(/\s+/g, "_"), g)
      byEnglish.set(e, g)
      byEnglish.set(compactLookupKey(g.english_title), g)
    }
    const t = g.title.toLowerCase().trim()
    byKorean.set(t, g)
    byKorean.set(compactLookupKey(g.title), g)
  }

  return { byKorean, byEnglish }
}

/**
 * 단일 TopLive 항목을 DB HomeGameRow에 매핑.
 * 매칭 키: 한글 title (소문자) → categoryId ↔ english_title (소문자, 공백→_)
 */
export function resolveTopLiveToHomeRow(
  live: TopLiveGame,
  maps: TopLiveHomeLookupMaps
): HomeGameRow | null {
  const displayTitle = live.title.toLowerCase().trim()
  const cat = live.categoryId.toLowerCase().trim()
  const catAsWords = cat.replace(/_/g, " ").replace(/\s+/g, " ").trim()
  const catCompact = compactLookupKey(live.categoryId)

  return (
    maps.byKorean.get(displayTitle) ??
    maps.byKorean.get(compactLookupKey(live.title)) ??
    maps.byEnglish.get(cat) ??
    maps.byEnglish.get(catAsWords) ??
    maps.byEnglish.get(catCompact) ??
    null
  )
}

/** 탐색 라이브: 치지직 순서 유지 + 매칭 여부 */
export type ExploreLiveListItem = {
  live: TopLiveGame
  db: HomeGameRow | null
}

export function buildExploreLiveItems(
  topLive: TopLiveGame[],
  dbGames: HomeGameRow[]
): ExploreLiveListItem[] {
  const maps = buildTopLiveHomeLookupMaps(dbGames)
  return topLive.map((live) => ({
    live,
    db: resolveTopLiveToHomeRow(live, maps),
  }))
}

/**
 * 치지직 Top 라이브 50과 매칭 가능한 `games` 행을 최대한 채웁니다.
 *
 * - 기본 집합: `fetchAllGamesForHome()`(캐시·500행 한도) 또는 인자로 받은 baseGames
 * - 한도 밖·표기 불일치로 매칭 실패 시 `game_mappings`와 steam_appid / 정확 제목으로 DB 추가 조회
 */
export async function fetchAndMergeHomeGamesForTopLive(
  topLive: TopLiveGame[],
  baseGames?: HomeGameRow[]
): Promise<HomeGameRow[]> {
  const base = baseGames ?? (await fetchAllGamesForHome())
  if (topLive.length === 0) return base

  const maps = buildTopLiveHomeLookupMaps(base)
  const unresolved = topLive.filter((live) => !resolveTopLiveToHomeRow(live, maps))
  if (unresolved.length === 0) return base

  const mappings = await getGameMappings()
  const baseSteam = new Set(base.filter((g) => g.steam_appid != null).map((g) => g.steam_appid as number))
  const steamIdsToFetch = new Set<number>()
  const titleCandidates = new Set<string>()

  for (const live of unresolved) {
    const slugEnglish = live.categoryId.replace(/_/g, " ").replace(/\s+/g, " ").trim()
    const m = resolveMapping(mappings, live.title, slugEnglish, live.title)
    if (m?.steam_appid != null && !baseSteam.has(m.steam_appid)) {
      steamIdsToFetch.add(m.steam_appid)
    }
    if (m) {
      titleCandidates.add(m.chzzk_title.trim())
    }
    titleCandidates.add(live.title.trim())
    if (slugEnglish.length > 0) titleCandidates.add(slugEnglish)
  }

  const [extraSteam, extraTitles] = await Promise.all([
    fetchSupplementGamesBySteamAppIds([...steamIdsToFetch]),
    fetchSupplementGamesByExactTitles([...titleCandidates]),
  ])

  const merged = new Map<number, HomeGameRow>()
  for (const g of base) merged.set(g.id, g)
  for (const g of extraSteam) merged.set(g.id, g)
  for (const g of extraTitles) merged.set(g.id, g)

  return [...merged.values()]
}

/**
 * TopLiveGame(Chzzk API) 배열을 DB HomeGameRow와 매칭하여 TrendingGameRow 배열로 변환.
 * 매칭 키: 한글 title (소문자) → english_title (소문자, 공백→_) → title (소문자)
 */
export function matchTopLiveGamesToTrendingRows(
  topLive: TopLiveGame[],
  dbGames: HomeGameRow[]
): TrendingGameRow[] {
  const maps = buildTopLiveHomeLookupMaps(dbGames)

  const result: TrendingGameRow[] = []
  for (const live of topLive) {
    const db = resolveTopLiveToHomeRow(live, maps)
    if (!db) continue

    const effectiveDiscount = getEffectiveDiscountRate(db.discount_rate)
    result.push({
      id: db.id,
      slug: db.slug ?? null,
      title: getDisplayGameTitle({ korean_title: db.korean_title, title: db.title }),
      korean_title: db.korean_title,
      english_title: db.english_title,
      steam_appid: db.steam_appid,
      cover_image_url: db.cover_image_url,
      header_image_url: db.header_image_url ?? db.cover_image_url,
      background_image_url: null,
      discount_rate: effectiveDiscount > 0 ? effectiveDiscount : null,
      price_krw: db.price_krw,
      original_price_krw: db.original_price_krw,
      currency: null,
      is_free: db.is_free,
      top_tags: db.top_tags,
      release_date: db.release_date,
      short_description: null,
      developer: null,
      publisher: null,
      last_data_update: null,
      totalViewers: live.concurrentUserCount,
      viewersFormatted: formatViewers(live.concurrentUserCount),
      liveStreamCount: live.openLiveCount,
      topTag: db.top_tags?.[0],
    })
  }

  return result.sort((a, b) => b.totalViewers - a.totalViewers)
}
