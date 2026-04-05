/**
 * Chzzk TopLive + DB 게임 매칭 (동기 유틸 — "use server" 모듈에서 분리)
 */
import type { TopLiveGame } from "@/lib/chzzk"
import { getDisplayGameTitle, getEffectiveDiscountRate } from "@/lib/utils"
import type { TrendingGameRow, HomeGameRow } from "@/lib/data"

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
    if (g.korean_title) byKorean.set(g.korean_title.toLowerCase().trim(), g)
    if (g.english_title) {
      byEnglish.set(g.english_title.toLowerCase().replace(/\s+/g, "_"), g)
      byEnglish.set(g.english_title.toLowerCase(), g)
    }
    byKorean.set(g.title.toLowerCase().trim(), g)
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
  return (
    maps.byKorean.get(live.title.toLowerCase().trim()) ??
    maps.byEnglish.get(live.categoryId.toLowerCase()) ??
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
