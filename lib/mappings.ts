/**
 * Game Mappings - Supabase 기반 유연한 부분 오버라이드
 *
 * CHZZK_STEAM_MAPPINGS 하드코딩 대체.
 * game_mappings 테이블에서 매핑을 로드하고 Map으로 반환.
 */

import { createAdminClient } from "@/lib/supabase/server"

export interface GameMapping {
  chzzk_title: string
  steam_appid: number | null
  skip_steam: boolean
  skip_igdb: boolean
  /** Steam 검색 시 사용할 타이틀 (null이면 기본 검색어 사용) */
  steam_title: string | null
  /** IGDB 검색 시 사용할 타이틀 (null이면 기본 검색어 사용) */
  igdb_title: string | null
  override_cover_image: string | null
  override_header_image: string | null
  override_background_image: string | null
  override_price: number | null
  override_is_free: boolean | null
  notes?: string | null
}

function normalizeForKey(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim()
}

/**
 * game_mappings 테이블에서 모든 매핑을 로드하여 Map으로 반환.
 * 키: chzzk_title (정규화: 공백 제거, 소문자)
 *
 * @returns Record<normalizedKey, GameMapping> - 여러 chzzk_title 변형이 동일 매핑을 가리킬 수 있음
 */
export async function getGameMappings(): Promise<Record<string, GameMapping>> {
  const supabase = createAdminClient()

  const { data: rows, error } = await supabase
    .from("game_mappings")
    .select("chzzk_title, steam_appid, skip_steam, skip_igdb, steam_title, igdb_title, override_cover_image, override_header_image, override_background_image, override_price, override_is_free, notes")

  if (error) {
    console.error("[GameMappings] Failed to fetch:", error.message)
    return {}
  }

  if (!rows || rows.length === 0) return {}

  const map: Record<string, GameMapping> = {}
  for (const row of rows) {
    const title = row.chzzk_title?.trim()
    if (!title) continue

    const mapping: GameMapping = {
      chzzk_title: title,
      steam_appid: row.steam_appid != null ? Number(row.steam_appid) : null,
      skip_steam: Boolean(row.skip_steam),
      skip_igdb: Boolean(row.skip_igdb),
      steam_title: row.steam_title?.trim() || null,
      igdb_title: row.igdb_title?.trim() || null,
      override_cover_image: row.override_cover_image?.trim() || null,
      override_header_image: row.override_header_image?.trim() || null,
      override_background_image: row.override_background_image?.trim() || null,
      override_price: row.override_price != null ? Number(row.override_price) : null,
      override_is_free: row.override_is_free == null ? null : Boolean(row.override_is_free),
      notes: row.notes?.trim() || null,
    }

    const exactKey = title
    const normKey = normalizeForKey(title)
    map[exactKey] = mapping
    map[normKey] = mapping
  }

  return map
}

/**
 * 게임 제목(들)으로 매핑 조회.
 * chzzk_title(한글) 우선, englishTitle, fallbackTitle 순으로 시도.
 */
export function resolveMapping(
  mappings: Record<string, GameMapping>,
  fallbackTitle: string,
  englishTitle?: string | null,
  koreanTitle?: string | null
): GameMapping | null {
  const titles = [
    koreanTitle?.trim(),
    englishTitle?.trim(),
    fallbackTitle?.trim(),
  ].filter((t): t is string => !!t)
  const seen = new Set<string>()
  for (const t of titles) {
    if (seen.has(t)) continue
    seen.add(t)
    const m = mappings[t] ?? mappings[normalizeForKey(t)]
    if (m) return m
  }
  return null
}
