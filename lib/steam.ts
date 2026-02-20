/**
 * Steam Store API Integration
 * 
 * Steam Web API Documentation:
 * https://partner.steamgames.com/doc/webapi
 * https://wiki.teamfortress.com/wiki/User:RJackson/StorefrontAPI
 */

import { delay } from "@/lib/utils"

/** Next.js fetch 확장 옵션 (revalidate 등) */
type NextFetchOptions = RequestInit & { next?: { revalidate?: number } }

/* ── Types ── */
export interface SteamPriceOverview {
  currency: string
  initial: number
  final: number
  discount_percent: number
  initial_formatted: string
  final_formatted: string
}

export interface SteamGameData {
  steam_appid: number
  name: string
  type: string
  is_free: boolean
  header_image: string
  background?: string
  price_overview?: SteamPriceOverview
  short_description?: string
  release_date?: {
    coming_soon: boolean
    date: string
  }
  genres?: Array<{
    id: string
    description: string
  }>
  categories?: Array<{
    id: number
    description: string
  }>
}

export interface SteamApiResponse {
  [appId: string]: {
    success: boolean
    data?: SteamGameData
  }
}

export interface ProcessedSteamData {
  steam_appid: number
  title: string
  cover_image_url: string
  header_image_url: string
  background_image_url: string | null
  short_description: string | null
  price_krw: number | null
  original_price_krw: number | null
  discount_rate: number | null
  is_free: boolean
  currency: string
  tags: string[]
}

export interface SteamSearchResult {
  id: number // appid
  type: number
  name: string
  discounted: boolean
  discount_percent: number
  original_price: number | null
  final_price: number | null
  currency: string
  large_capsule_image: string
  small_capsule_image: string
  windows_available: boolean
  mac_available: boolean
  linux_available: boolean
  streamingvideo_available: boolean
  discount_expiration: number | null
  header_image: string
  controller_support: string
}

export interface SteamSearchResponse {
  success: number
  items: SteamSearchResult[]
  total: number
}

/* ── Constants ── */
const STEAM_API_BASE = "https://store.steampowered.com/api"
const STEAM_SEARCH_API = "https://store.steampowered.com/api/storesearch"
const RATE_LIMIT_DELAY = 1500 // 1.5초 (스팀 API Rate Limit 고려)

/* ── Helper Functions ── */

/**
 * Search for games on Steam by name
 * 
 * @param gameName - Game name to search (Korean or English)
 * @param maxResults - Maximum number of results to return (default: 5)
 * @returns Array of search results with appid
 */
export async function searchSteamGame(
  gameName: string,
  maxResults: number = 5
): Promise<SteamSearchResult[]> {
  try {
    const encodedQuery = encodeURIComponent(gameName)
    const url = `${STEAM_SEARCH_API}/?term=${encodedQuery}&l=koreana&cc=kr`
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Driflux/1.0",
      },
    })

    if (!response.ok) {
      console.error(`[Steam Search] HTTP Error: ${response.status}`)
      return []
    }

    const data: SteamSearchResponse = await response.json()
    
    if (!data.items || data.items.length === 0) {
      return []
    }

    const results = data.items.slice(0, maxResults)
    return results

  } catch (error) {
    console.error(`[Steam Search] Error searching for "${gameName}":`, error)
    return []
  }
}

/**
 * Normalize string for comparison (remove spaces, special chars, lowercase)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, '') // Remove special characters but keep Korean
    .replace(/\s+/g, '') // Remove all spaces
    .trim()
}

/**
 * Check if two game names are similar enough
 * 
 * @param name1 - First game name
 * @param name2 - Second game name
 * @returns Similarity score (0-100)
 */
function calculateSimilarity(name1: string, name2: string): number {
  const normalized1 = normalizeString(name1)
  const normalized2 = normalizeString(name2)
  
  // Exact match
  if (normalized1 === normalized2) {
    return 100
  }
  
  // One contains the other (partial match)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    const shorter = normalized1.length < normalized2.length ? normalized1 : normalized2
    const longer = normalized1.length >= normalized2.length ? normalized1 : normalized2
    return Math.floor((shorter.length / longer.length) * 80) // 80% max for partial match
  }
  
  // Calculate Levenshtein distance for fuzzy matching
  const distance = levenshteinDistance(normalized1, normalized2)
  const maxLength = Math.max(normalized1.length, normalized2.length)
  const similarity = Math.floor((1 - distance / maxLength) * 100)
  
  return Math.max(0, similarity)
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

/**
 * 스핀오프 차단: steamTitle이 query를 포함하지만 길이가 비정상적으로 긴 경우 차단
 * 예: "로스트아크" ↔ "ARK : Lost Colony", "롤" ↔ "리그 오브 레전드 이야기"
 */
function shouldExcludeByLengthPenalty(query: string, steamTitle: string): boolean {
  const queryNorm = normalizeString(query)
  const steamNorm = normalizeString(steamTitle)

  // 한쪽이 다른 쪽을 포함하는 경우에만 길이 검사
  const steamContainsQuery = steamNorm.includes(queryNorm)
  const queryContainsSteam = queryNorm.includes(steamNorm)
  if (!steamContainsQuery && !queryContainsSteam) {
    return false
  }

  // 검색어가 너무 짧을 때 (3글자 이하): 더 엄격한 비율 (1.2배)
  const minQueryLen = 3
  const ratioThreshold = queryNorm.length <= minQueryLen ? 1.2 : 1.5

  if (steamNorm.length > queryNorm.length * ratioThreshold) {
    return true // 스핀오프로 판단 → 제외
  }

  return false
}

/**
 * Find best matching Steam game by name with strict matching
 * Returns appid only if confidence is high enough
 * 
 * @param gameName - Game name to search (Korean or English)
 * @param minSimilarity - Minimum similarity threshold (0-100, default: 85)
 * @returns Object with appid and confidence, or null if no good match
 */
export async function findSteamAppIdWithConfidence(
  gameName: string,
  minSimilarity: number = 85
): Promise<{ appId: number; confidence: number; matchedName: string } | null> {
  // Steam API 검색 (블랙리스트/매핑은 update-steam 등 호출측에서 DB game_mappings로 처리)
  const results = await searchSteamGame(gameName, 10)
  if (results.length === 0) {
    return null
  }

  const cleanQuery = gameName.toLowerCase().replace(/\s+/g, "")

  let bestMatch: { appId: number; confidence: number; matchedName: string } | null = null

  for (const result of results) {
    const cleanSteamTitle = result.name.toLowerCase().replace(/\s+/g, "")
    // [핵심] 공백 제거한 완벽 일치 → 길이 패널티/유사도와 무관하게 즉시 매칭 (GTFO 등 짧은 이름 오탐지 방지)
    if (cleanQuery === cleanSteamTitle) {
      return { appId: result.id, confidence: 100, matchedName: result.name }
    }

    // 스핀오프 차단: steamTitle이 query를 포함하지만 길이가 query의 1.5배 초과 시 제외
    if (shouldExcludeByLengthPenalty(gameName, result.name)) {
      continue
    }

    const similarity = calculateSimilarity(gameName, result.name)

    if (similarity >= minSimilarity && (!bestMatch || similarity > bestMatch.confidence)) {
      bestMatch = {
        appId: result.id,
        confidence: similarity,
        matchedName: result.name,
      }
    }
  }

  return bestMatch
}

/**
 * Find best matching Steam game by name
 * Returns the first result (most relevant match)
 * 
 * @param gameName - Game name to search
 * @returns AppID of best match, or null if not found
 * @deprecated Use findSteamAppIdWithConfidence for better accuracy
 */
export async function findSteamAppId(gameName: string): Promise<number | null> {
  const result = await findSteamAppIdWithConfidence(gameName, 70)
  return result ? result.appId : null
}

/**
 * Fetch game details from Steam Store API
 * 
 * @param appId - Steam App ID
 * @param countryCode - Country code (default: "kr" for Korea)
 * @returns Steam game data
 */
export async function getSteamGameDetails(
  appId: number,
  countryCode: string = "kr"
): Promise<SteamGameData | null> {
  try {
    // IMPORTANT: cc=kr (country) and l=koreana (language) are required for Korean pricing
    const url = `${STEAM_API_BASE}/appdetails?appids=${appId}&cc=${countryCode}&l=koreana`
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Driflux/1.0",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    } as NextFetchOptions)

    if (!response.ok) {
      console.error(`[Steam API] HTTP Error: ${response.status}`)
      return null
    }

    const data: SteamApiResponse = await response.json()
    const appData = data[appId.toString()]

    if (!appData || !appData.success) {
      console.error(`[Steam API] App ${appId} not found or failed`)
      return null
    }

    if (!appData.data) {
      console.error(`[Steam API] No data for app ${appId}`)
      return null
    }

    return appData.data

  } catch (error) {
    console.error(`[Steam API] Error fetching app ${appId}:`, error)
    return null
  }
}

/**
 * Process Steam data into database-ready format
 * 
 * @param steamData - Raw Steam API data
 * @returns Processed data ready for database insertion
 */
export function processSteamData(steamData: SteamGameData): ProcessedSteamData {
  // Price processing logic with priority:
  // 1. If is_free is true -> all prices are 0
  // 2. If price_overview exists -> use Steam's provided values
  // 3. Otherwise -> null (coming soon, not released, etc.)
  
  let price_krw: number | null = null
  let original_price_krw: number | null = null
  let discount_rate: number | null = null
  let currency = "KRW"

  if (steamData.is_free) {
    // Free games: set all prices to 0
    price_krw = 0
    original_price_krw = 0
    discount_rate = 0
  } else if (steamData.price_overview) {
    // Paid games with pricing info
    const priceOverview = steamData.price_overview
    price_krw = priceOverview.final
    original_price_krw = priceOverview.initial
    discount_rate = priceOverview.discount_percent
    currency = priceOverview.currency
  }
  // else: prices remain null (coming soon, region-locked, etc.)

  // Extract genre tags from Steam API
  const tags: string[] = []
  if (steamData.genres && Array.isArray(steamData.genres)) {
    tags.push(...steamData.genres.map(genre => genre.description))
  }

  return {
    steam_appid: steamData.steam_appid,
    title: steamData.name,
    cover_image_url: steamData.header_image,
    header_image_url: steamData.header_image,
    background_image_url: steamData.background || null,
    short_description: steamData.short_description?.trim() || null,
    price_krw,
    original_price_krw,
    discount_rate,
    is_free: steamData.is_free,
    currency,
    tags,
  }
}

/**
 * Fetch and process multiple games with rate limiting
 * 
 * @param appIds - Array of Steam App IDs
 * @param countryCode - Country code
 * @returns Array of processed game data
 */
export async function getSteamGamesBatch(
  appIds: number[],
  countryCode: string = "kr"
): Promise<ProcessedSteamData[]> {
  const results: ProcessedSteamData[] = []

  for (const appId of appIds) {
    const steamData = await getSteamGameDetails(appId, countryCode)
    
    if (steamData) {
      results.push(processSteamData(steamData))
    }

    // Rate limiting: wait before next request
    if (appIds.indexOf(appId) < appIds.length - 1) {
      await delay(RATE_LIMIT_DELAY)
    }
  }

  return results
}

/**
 * Format price in Korean Won
 */
export function formatPriceKRW(price: number | null): string {
  if (price === null || price === 0) return "무료"
  return `₩${price.toLocaleString("ko-KR")}`
}

/**
 * Get Steam store URL for a game
 */
export function getSteamStoreUrl(appId: number): string {
  return `https://store.steampowered.com/app/${appId}`
}

/* ── Popular Game IDs for Testing ── */
export const POPULAR_STEAM_GAMES = {
  ELDEN_RING: 1245620,
  CYBERPUNK_2077: 1091500,
  BALDURS_GATE_3: 1086940,
  STARDEW_VALLEY: 413150,
  TERRARIA: 105600,
  HOLLOW_KNIGHT: 367520,
  CELESTE: 504230,
  HADES: 1145360,
  SEKIRO: 814380,
  DARK_SOULS_3: 374320,
  THE_WITCHER_3: 292030,
  RED_DEAD_REDEMPTION_2: 1174180,
  GTA_V: 271590,
  PORTAL_2: 620,
  HALF_LIFE_2: 220,
} as const
