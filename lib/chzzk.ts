/**
 * Chzzk (치지직) Live Streaming API Integration
 * 
 * Chzzk API Documentation:
 * https://api.chzzk.naver.com/service/v1/channels/{channelId}/live-detail
 */

import { delay } from "@/lib/utils"

/** Next.js fetch 확장 옵션 (revalidate 등) */
type NextFetchOptions = RequestInit & { next?: { revalidate?: number } }

/* ── Types ── */
export interface ChzzkLiveContent {
  liveTitle: string
  status: "OPEN" | "CLOSE" | string
  liveImageUrl: string
  concurrentUserCount: number
  accumulateCount: number
  categoryType: string
  liveCategory: string
  liveCategoryValue: string
  openDate: string
  adult: boolean
  tags: string[]
  chatChannelId: string
  channel?: {
    channelId: string
    channelName: string
    channelImageUrl: string
  }
}

export interface ChzzkApiResponse {
  code: number
  message: string | null
  content: ChzzkLiveContent | null
}

export interface ProcessedChzzkData {
  chzzk_channel_id: string
  title: string
  thumbnail_url: string | null
  is_live: boolean
  viewer_count: number
  category?: string
}

export interface ChzzkSearchLiveItem {
  channel: {
    channelId: string
    channelName: string
    channelImageUrl: string
    verifiedMark: boolean
  }
  liveTitle: string
  liveImageUrl: string
  defaultThumbnailImageUrl: string | null
  concurrentUserCount: number
  accumulateCount: number
  openDate: string
  adult: boolean
  tags: string[]
  categoryType: string | null
  liveCategory: string | null
  liveCategoryValue: string | null
}

export interface ChzzkSearchResponse {
  code: number
  message: string | null
  content: {
    size: number
    page: {
      next: {
        offset: number
      } | null
    }
    data: ChzzkSearchLiveItem[]
  } | null
}

export interface SearchedStreamData {
  channelId: string
  channelName: string
  liveTitle: string
  liveImageUrl: string
  concurrentUserCount: number
  openDate: string
  category?: string | null
  /** 드롭스 활성화 여부 (dropsCampaignNo가 있으면 true) */
  hasDrops?: boolean
}

/** 다시보기 영상 API 응답 아이템 */
export interface ChzzkVideoItem {
  videoNo: number
  videoId: string
  videoTitle: string
  videoType: string
  publishDate: string
  thumbnailImageUrl: string
  duration: number
  readCount: number
  videoCategory: string
  videoCategoryValue: string
  channel: {
    channelId: string
    channelName: string
    channelImageUrl: string
  }
}

/** 라이브 카테고리 API 응답 아이템 (getPopularCategories) */
export interface ChzzkPopularCategory {
  title: string
  originalId: string
  viewerCount: number
  imageUrl: string | null
}

/**
 * categories/live API 원본 응답 아이템
 * GET /service/v1/categories/live?categoryType=GAME
 */
export interface ChzzkLiveCategoryItem {
  /** 카테고리 영문 ID (e.g. "League_of_Legends") */
  categoryId: string
  /** 카테고리 표시 이름 한글 (e.g. "리그 오브 레전드") */
  categoryValue: string
  /** 현재 동시 시청자 수 합산 */
  concurrentUserCount: number
  /** 현재 라이브 방송 수 */
  openLiveCount: number
  /** 포스터/커버 이미지 URL (null 가능) */
  posterImageUrl: string | null
}

/**
 * getTopLiveGames 반환 타입
 * 실시간 트렌딩·라이브 탐색 컴포넌트에서 사용
 */
export interface TopLiveGame {
  /** Chzzk 카테고리 ID (영문, fetch 파라미터로 사용) */
  categoryId: string
  /** 게임 표시 이름 (한글 우선) */
  title: string
  /** 현재 동시 시청자 수 */
  concurrentUserCount: number
  /** 현재 라이브 방송 수 */
  openLiveCount: number
  /** 포스터 이미지 URL */
  posterImageUrl: string | null
}

/** 특정 게임 클립 API 응답 아이템 */
export interface ChzzkClipItem {
  clipUID: string
  videoId: string
  clipTitle: string
  ownerChannelId: string
  ownerChannel: {
    channelId: string
    channelName: string
    channelImageUrl: string
    verifiedMark?: boolean
  }
  thumbnailImageUrl: string
  clipCategory: string
  duration: number
  adult: boolean
  createdDate: string
  readCount: number
}

/* ── Constants ── */
export const CHZZK_API_BASE = "https://api.chzzk.naver.com"
const CHZZK_SERVICE_V1 = `${CHZZK_API_BASE}/service/v1`
const CHZZK_SERVICE_V2 = `${CHZZK_API_BASE}/service/v2`
export const CHZZK_SEARCH_LIVES_URL = `${CHZZK_SERVICE_V1}/search/lives`
export const CHZZK_CATEGORY_LIVES_URL = (categoryId: string) =>
  `${CHZZK_SERVICE_V2}/categories/GAME/${encodeURIComponent(categoryId)}/lives`
export const CHZZK_CATEGORY_VIDEOS_URL = (categoryId: string) =>
  `${CHZZK_SERVICE_V2}/categories/GAME/${encodeURIComponent(categoryId)}/videos`
const CHZZK_CATEGORY_CLIPS_URL = (categoryId: string) =>
  `${CHZZK_SERVICE_V1}/categories/GAME/${encodeURIComponent(categoryId)}/clips`
const CHZZK_CATEGORY_INFO_URL = (categoryId: string) =>
  `${CHZZK_SERVICE_V1}/categories/GAME/${encodeURIComponent(categoryId)}/info`

/**
 * 치지직 GAME categoryId는 공백 대신 언더스코어를 사용합니다 (예: `Slay_the_Spire2`).
 * 게임 메타/DB에 공백이 섞여 있어도 API 경로와 일치하도록 전처리합니다.
 */
export function formatChzzkGameCategoryIdForApi(categoryId: string): string {
  return categoryId.trim().replace(/ /g, "_")
}

/**
 * 치지직 웹 — 게임 카테고리 라이브 탭 URL (시청자 순 랜딩)
 * 예: https://chzzk.naver.com/category/GAME/League_of_Legends/lives
 */
export function getChzzkGameCategoryWebLivesUrl(categoryId: string): string {
  const slug = formatChzzkGameCategoryIdForApi(categoryId)
  return `https://chzzk.naver.com/category/GAME/${encodeURIComponent(slug)}/lives`
}

/** categories/live: 문서상 size 최대 50 — 초과 시 400(잘못된 값) 가능 */
export const CHZZK_CATEGORIES_LIVE_MAX_SIZE = 50

/**
 * GAME 라이브 카테고리 목록 (게임·시청자 집계용)
 * GET /service/v1/categories/live
 */
export function buildChzzkCategoriesLiveUrl(): string {
  const params = new URLSearchParams({
    categoryType: "GAME",
    size: String(CHZZK_CATEGORIES_LIVE_MAX_SIZE),
  })
  return `${CHZZK_SERVICE_V1}/categories/live?${params.toString()}`
}

/**
 * 전체 라이브 방송 목록 (시청자순) — 스트림 단위
 * GET /service/v1/lives — sortType 은 대문자 POPULAR 고정
 */
export function buildChzzkServiceV1LivesUrl(): string {
  const params = new URLSearchParams({
    size: String(CHZZK_CATEGORIES_LIVE_MAX_SIZE),
    sortType: "POPULAR",
  })
  return `${CHZZK_SERVICE_V1}/lives?${params.toString()}`
}

/** @deprecated buildChzzkCategoriesLiveUrl() 사용 권장 */
export const CHZZK_TOP_LIVE_GAMES_URL = buildChzzkCategoriesLiveUrl()

const RATE_LIMIT_DELAY = 1000 // 1초 (치지직 API Rate Limit 고려)
const DEFAULT_THUMBNAIL_SIZE = "720" // 썸네일 해상도 (480, 720, 1080 등)
const DEFAULT_THUMBNAIL_URL = "https://via.placeholder.com/1280x720/1a1a1a/ffffff?text=No+Thumbnail" // Fallback thumbnail

/* ── ISR Revalidate Intervals (seconds) ── */
const REVALIDATE_LIVE = 60    // 라이브 스트림/트렌딩 — 60초
const REVALIDATE_VOD  = 300   // VOD / 클립 — 5분
const REVALIDATE_META = 300   // 게임 포스터 등 메타 — 5분

// Polling API는 봇 차단이 덜하므로 service/v1 대신 polling/v2 사용
// User-Agent는 여전히 최신 Chrome으로 유지
const BROWSER_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

/** categories/live·게임별 lives/videos/clips 등 JSON API용 브라우저 유사 헤더 (크론/상세 페이지 공통) */
export const CHZZK_JSON_BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": BROWSER_USER_AGENT,
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  Origin: "https://chzzk.naver.com",
  Referer: "https://chzzk.naver.com/",
}

/** API `content`가 배열이거나 `{ data: [] }` 형태일 때 목록 배열로 정규화 */
function chzzkListFromContent(content: unknown): unknown[] {
  if (Array.isArray(content)) return content
  if (
    content &&
    typeof content === "object" &&
    Array.isArray((content as { data?: unknown[] }).data)
  ) {
    return (content as { data: unknown[] }).data
  }
  return []
}

export type FetchChzzkCategoriesLiveTextFirstResult = {
  categories: ChzzkLiveCategoryItem[]
  /** 응답 원문 (HTML 차단 페이지 포함 가능) */
  rawText: string
  parseError: string | null
  parsed: unknown | null
  httpOk: boolean
  httpStatus: number
}

/**
 * categories/live — 응답을 text()로 받은 뒤 JSON.parse (파싱 실패·HTML 응답 대비)
 */
export async function fetchChzzkCategoriesLiveTextFirst(
  url: string,
  extraInit: NextFetchOptions = {}
): Promise<FetchChzzkCategoriesLiveTextFirstResult> {
  console.log("[Chzzk Fetch Request URL]:", url)

  const response = await fetch(url, {
    method: "GET",
    headers: CHZZK_JSON_BROWSER_HEADERS,
    ...extraInit,
  } as NextFetchOptions)

  const rawText = await response.text()
  console.log("[Chzzk Raw Response]:", rawText.slice(0, 300))

  if (!response.ok) {
    console.error(
      `[Chzzk] HTTP ${response.status} — body prefix:`,
      rawText.slice(0, 1000)
    )
    return {
      categories: [],
      rawText,
      parseError: null,
      parsed: null,
      httpOk: false,
      httpStatus: response.status,
    }
  }

  let parsed: unknown = null
  try {
    parsed = JSON.parse(rawText)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(
      "[Chzzk] JSON.parse failed:",
      msg,
      "| raw prefix:",
      rawText.slice(0, 500)
    )
    return {
      categories: [],
      rawText,
      parseError: msg,
      parsed: null,
      httpOk: true,
      httpStatus: response.status,
    }
  }

  const raw = parsed as Record<string, unknown>
  const code = raw?.code
  if (typeof code === "number" && code !== 200) {
    console.error("[Chzzk] API body code !== 200:", code, raw?.message)
  }

  const content = raw?.content as Record<string, unknown> | null | undefined
  const data = content?.data
  const categories = (
    Array.isArray(data) ? data : Array.isArray(content) ? content : []
  ) as ChzzkLiveCategoryItem[]

  return {
    categories,
    rawText,
    parseError: null,
    parsed,
    httpOk: true,
    httpStatus: response.status,
  }
}

/* ── Helper Functions ── */

/**
 * Replace thumbnail size placeholder in Chzzk image URL
 * 
 * Chzzk API returns image URLs with {type} placeholder that needs to be replaced
 * with actual size: 480, 720, 1080, etc.
 * 
 * @param url - Original image URL with {type} placeholder
 * @param size - Desired size (default: 720 for high quality)
 * @returns Processed URL with actual size
 * 
 * @example
 * processChzzkImageUrl("https://...image_{type}.jpg", "720")
 * // Returns: "https://...image_720.jpg"
 */
export function processChzzkImageUrl(url: string, size: string = DEFAULT_THUMBNAIL_SIZE): string {
  if (!url) return ""
  
  // Replace all occurrences of {type} with the specified size
  return url.replace(/{type}/g, size)
}

/**
 * Fetch live status from Chzzk Polling API (v2)
 * 
 * IMPORTANT: Changed to polling/v2 endpoint to avoid Error 9004
 * The polling API has less strict bot detection than live-detail API
 * 
 * @param channelId - Chzzk Channel ID (e.g., "c1f0a24755fb3e583fb0a588f921c84b")
 * @returns Live stream data or default offline status
 */
export async function getChzzkLiveStatus(
  channelId: string
): Promise<ProcessedChzzkData> {
  try {
    if (channelId == null || typeof channelId !== "string" || channelId.trim() === "") {
      console.warn(`[Chzzk API] Skipping invalid channelId:`, JSON.stringify(channelId))
      return createOfflineStatus("")
    }

    const trimmedId = channelId.trim()
    const url = `${CHZZK_API_BASE}/polling/v2/channels/${trimmedId}/live-status`
    console.log("[Chzzk Request] Fetching:", url)

    const response = await fetch(url, {
      method: "GET",
      headers: CHZZK_JSON_BROWSER_HEADERS,
      next: { revalidate: 60 }, // Cache for 1 minute (live data changes frequently)
    } as NextFetchOptions)

    const rawText = await response.text()
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[Chzzk API] 404 Not Found (channel may not exist): ${url}`)
      } else {
        console.error(`[Chzzk API] ✗ HTTP Error: ${response.status} ${response.statusText}`)
        console.error(`[Chzzk API] Error Response Body:`, rawText)
      }
      console.warn(`[Chzzk API] Returning offline status (soft fail)`)
      return createOfflineStatus(trimmedId)
    }

    let data: ChzzkApiResponse
    try {
      data = JSON.parse(rawText) as ChzzkApiResponse
    } catch (e) {
      console.error(`[Chzzk API] JSON parse failed:`, e)
      console.error(`[Chzzk API] Raw:`, rawText)
      return createOfflineStatus(trimmedId)
    }

    // Check API response code
    if (!data || typeof data.code === 'undefined') {
      console.error(`[Chzzk API] ✗ Invalid response structure (no code field)`)
      console.error(`[Chzzk API] Response keys:`, Object.keys(data || {}))
      console.warn(`[Chzzk API] Returning offline status to prevent cron failure`)
      return createOfflineStatus(trimmedId)
    }

    if (data.code !== 200) {
      console.error(`[Chzzk API] ✗ API returned non-200 code: ${data.code}`)
      console.error(`[Chzzk API] Error Message: ${data.message}`)
      
      // Log specific error codes but don't throw
      if (data.code === 9004) {
        console.error(`[Chzzk API] ✗ ERROR 9004: App update required`)
        console.error(`[Chzzk API] This should not happen with polling API!`)
      }
      
      console.warn(`[Chzzk API] Returning offline status to prevent cron failure`)
      return createOfflineStatus(trimmedId)
    }

    if (!data.content) {
      console.warn(`[Chzzk API] ✗ Content is null (channel may not exist or be private)`)
      console.warn(`[Chzzk API] Returning offline status to prevent cron failure`)
      return createOfflineStatus(trimmedId)
    }

    const content = data.content

    // Check if channel is live
    const isLive = content.status === "OPEN"

    if (!isLive) {
      return createOfflineStatus(trimmedId, content.liveTitle)
    }

    // Channel is LIVE - process thumbnail URL
    let thumbnailUrl: string | null = null
    
    if (content.liveImageUrl) {
      // CRITICAL: Always replace {type} placeholder with 720 for high quality
      if (content.liveImageUrl.includes("{type}")) {
        thumbnailUrl = content.liveImageUrl.replace(/{type}/g, "720")
      } else {
        thumbnailUrl = content.liveImageUrl
      }
    } else {
      console.warn(`[Chzzk API] ⚠ liveImageUrl is null, using default thumbnail`)
      thumbnailUrl = DEFAULT_THUMBNAIL_URL
    }

    // Extract category/game name (liveCategoryValue is more reliable than liveCategory)
    const categoryName = content.liveCategoryValue || content.liveCategory || null

    // Build processed data object
    const processedData: ProcessedChzzkData = {
      chzzk_channel_id: trimmedId,
      title: content.liveTitle || "제목 없음",
      thumbnail_url: thumbnailUrl,
      is_live: true,
      viewer_count: content.concurrentUserCount || 0,
      category: categoryName || undefined,
    }

    return processedData

  } catch (error) {
    console.error(`[Chzzk API] ✗ Exception occurred while fetching channel ${channelId}`, error)
    console.error(`[Chzzk API] Error Type: ${error instanceof Error ? error.constructor.name : typeof error}`)
    console.error(`[Chzzk API] Error Message:`, error instanceof Error ? error.message : String(error))
    console.error(`[Chzzk API] Error Stack:`, error instanceof Error ? error.stack : 'N/A')
    console.warn(`[Chzzk API] Returning offline status to prevent cron failure`)
    console.error(`[Chzzk API] ========================================\n`)
    return createOfflineStatus(channelId)
  }
}

/**
 * Create default offline status object
 * 
 * @param channelId - Channel ID
 * @param lastTitle - Last known stream title (optional)
 * @returns Offline status object
 */
function createOfflineStatus(
  channelId: string, 
  lastTitle?: string
): ProcessedChzzkData {
  
  return {
    chzzk_channel_id: channelId,
    title: lastTitle || "방송 종료",
    thumbnail_url: null,
    is_live: false,
    viewer_count: 0,
  }
}

/**
 * Fetch and process multiple channels with rate limiting
 * 
 * @param channelIds - Array of Chzzk Channel IDs
 * @returns Array of processed live data
 */
export async function getChzzkLiveStatusBatch(
  channelIds: string[]
): Promise<ProcessedChzzkData[]> {
  const results: ProcessedChzzkData[] = []

  for (const channelId of channelIds) {
    const liveData = await getChzzkLiveStatus(channelId)
    results.push(liveData)

    // Rate limiting: wait before next request
    if (channelIds.indexOf(channelId) < channelIds.length - 1) {
      await delay(RATE_LIMIT_DELAY)
    }
  }

  return results
}

/**
 * Format viewer count in Korean style
 */
export function formatViewerCount(count: number | null): string {
  if (count === null || count === 0) return "0명"
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}만명`
  }
  return `${count.toLocaleString("ko-KR")}명`
}

/**
 * Get Chzzk channel URL
 */
export function getChzzkChannelUrl(channelId: string): string {
  return `https://chzzk.naver.com/live/${channelId}`
}

/**
 * Get popular live game categories from Chzzk (service/v1/categories/live)
 *
 * 이전 /home/recommend/game API가 404로 deprecated 되어
 * 라이브 카테고리 API로 교체됨.
 *
 * @param size - 반환할 카테고리 개수 (기본: 50, API에서 최대 50개 fetch)
 * @returns 인기순 정렬된 게임 카테고리 목록
 */
export async function getPopularCategories(
  size: number = 50
): Promise<ChzzkPopularCategory[]> {
  try {
    const url = buildChzzkCategoriesLiveUrl()
    console.log("[Chzzk Request] Fetching live categories:", url)

    const r = await fetchChzzkCategoriesLiveTextFirst(url, {
      next: { revalidate: REVALIDATE_LIVE },
    })
    if (!r.httpOk || r.parseError) return []

    const items = r.categories

    const categories: ChzzkPopularCategory[] = items.map((item: any) => ({
      title: item.categoryValue ?? "",
      originalId: item.categoryId ?? "",
      viewerCount: Number(item.concurrentUserCount) ?? 0,
      imageUrl: item.posterImageUrl ?? null,
    }))

    const result = categories
      .filter((c) => c.title && c.originalId)
      .slice(0, size)

    console.log(`[Chzzk] Fetched ${categories.length} live categories, returning ${result.length}.`)
    return result
  } catch (error) {
    console.error("[Chzzk] Failed to fetch categories:", error)
    return []
  }
}

/**
 * 실시간 라이브 게임 Top 50 가져오기
 *
 * [라이브 탐색] 탭과 [실시간 트렌딩] 섹션에서 사용.
 * 치지직 categories/live API를 직접 호출하여 현재 시청자 수·방송 수 포함.
 *
 * API: GET /service/v1/categories/live?categoryType=GAME&size=50 (최대 50)
 * 캐싱: Next.js ISR 60초 (Vercel Edge Cache 활용)
 *
 * @param size - 반환할 게임 수 (기본: 50, 최대: 50)
 * @returns 시청자 수 내림차순 정렬된 TopLiveGame 배열
 */
export async function getTopLiveGames(size: number = 50): Promise<TopLiveGame[]> {
  try {
    const topUrl = buildChzzkCategoriesLiveUrl()
    console.log("[Chzzk Request] Fetching top live games:", topUrl)

    const r = await fetchChzzkCategoriesLiveTextFirst(topUrl, {
      next: { revalidate: REVALIDATE_LIVE },
    })

    if (!r.httpOk || r.parseError) return []

    const json = r.parsed as { code?: number } | null
    if (!json || json.code !== 200) {
      console.error(`[Chzzk TopLiveGames] ✗ API Error: code=${json?.code}`)
      return []
    }

    const items: ChzzkLiveCategoryItem[] = r.categories

    if (!Array.isArray(items) || items.length === 0) {
      console.warn("[Chzzk TopLiveGames] Empty response")
      return []
    }

    const result: TopLiveGame[] = items
      .filter((item) => item.categoryId && item.categoryValue)
      .map((item) => ({
        categoryId: item.categoryId,
        title: item.categoryValue,
        concurrentUserCount: Number(item.concurrentUserCount ?? 0),
        openLiveCount: Number(item.openLiveCount ?? 0),
        posterImageUrl: item.posterImageUrl ?? null,
      }))
      .sort((a, b) => b.concurrentUserCount - a.concurrentUserCount)
      .slice(0, Math.min(size, 50))

    console.log(`[Chzzk] getTopLiveGames: returning ${result.length} games (top by viewers).`)
    return result
  } catch (error) {
    console.error("[Chzzk TopLiveGames] ✗ Exception:", error instanceof Error ? error.message : String(error))
    return []
  }
}

/**
 * 치지직 게임 정보 API - posterImageUrl(포스터 이미지) 조회
 *
 * API: GET https://api.chzzk.naver.com/service/v1/categories/GAME/{slug}/info
 *
 * @param categoryId - Chzzk category ID (e.g., "Minecraft", "League_of_Legends", "BIOHAZARD_requiem")
 * @returns posterImageUrl or null
 */
export async function fetchChzzkGamePosterImage(categoryId: string): Promise<string | null> {
  if (!categoryId || typeof categoryId !== "string" || categoryId.trim() === "") {
    return null
  }

  const formattedCategoryId = formatChzzkGameCategoryIdForApi(categoryId)
  const url = CHZZK_CATEGORY_INFO_URL(formattedCategoryId)

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: CHZZK_JSON_BROWSER_HEADERS,
      next: { revalidate: REVALIDATE_META },
    } as NextFetchOptions)

    const rawText = await response.text()
    if (!response.ok) {
      console.error("[Fetch Game Poster Error]:", rawText)
      return null
    }

    let data: { content?: { posterImageUrl?: string }; posterImageUrl?: string }
    try {
      data = JSON.parse(rawText)
    } catch (e) {
      console.error("[Fetch Game Poster Error] (JSON parse):", e, rawText)
      return null
    }
    const posterUrl = (data?.content?.posterImageUrl ?? data?.posterImageUrl)?.trim()
    return posterUrl || null
  } catch (e) {
    console.error("[Fetch Game Poster Error] (exception):", e)
    return null
  }
}

/**
 * Get live streams by category ID (highly accurate, category-specific API)
 *
 * API: GET https://api.chzzk.naver.com/service/v2/categories/GAME/{categoryId}/lives
 * Replaces keyword search with exact category lookup.
 *
 * @param categoryId - Chzzk category ID (e.g., "League_of_Legends", "Rimworld")
 * @returns Array of stream data in SearchedStreamData format
 */
export async function getChzzkStreamsByCategory(
  categoryId: string
): Promise<SearchedStreamData[]> {
  if (!categoryId || typeof categoryId !== "string" || categoryId.trim() === "") {
    console.warn("[Chzzk Category] Skipping invalid categoryId:", JSON.stringify(categoryId))
    return []
  }

  const formattedCategoryId = formatChzzkGameCategoryIdForApi(categoryId)
  const url = CHZZK_CATEGORY_LIVES_URL(formattedCategoryId)
  console.log("[Chzzk Request] Fetching category lives:", url)

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: CHZZK_JSON_BROWSER_HEADERS,
      next: { revalidate: REVALIDATE_LIVE },
    } as NextFetchOptions)

    const rawText = await response.text()
    if (!response.ok) {
      console.error("[Fetch Lives Error]:", rawText)
      return []
    }

    let dataL: { code?: number; content?: unknown }
    try {
      dataL = JSON.parse(rawText)
    } catch (e) {
      console.error("[Fetch Lives Error] (JSON parse):", e, rawText)
      return []
    }
    if (!dataL || dataL.code !== 200) {
      console.error(`[Fetch Lives Error] (API code):`, dataL?.code, rawText)
      return []
    }

    const items = chzzkListFromContent(dataL.content)
    console.log(`[Chzzk] Fetched ${items.length} streams for category "${formattedCategoryId}".`)

    if (items.length === 0) {
      return []
    }

    const results: SearchedStreamData[] = items
      .filter((item: any) => item?.channel?.channelId)
      .map((item: any) => {
        const channelId = item.channel?.channelId ?? item.channelId ?? ""
        const channelName = item.channel?.channelName ?? item.channelName ?? "Unknown"
        let thumbnailUrl = item.liveImageUrl ?? ""
        if (thumbnailUrl && thumbnailUrl.includes("{type}")) {
          thumbnailUrl = thumbnailUrl.replace(/{type}/g, "1080")
        }
        const hasDrops = !!(item.dropsCampaignNo ?? item.dropsCampaignNos?.length)
        return {
          channelId,
          channelName,
          liveTitle: item.liveTitle ?? item.title ?? "No Title",
          liveImageUrl: thumbnailUrl,
          concurrentUserCount: Number(item.concurrentUserCount ?? 0),
          openDate: item.openDate ?? new Date().toISOString(),
          category: item.liveCategoryValue ?? item.liveCategory ?? formattedCategoryId,
          hasDrops,
        }
      })
      .filter((s) => s.channelId)
      .sort((a, b) => b.concurrentUserCount - a.concurrentUserCount)

    return results
  } catch (error) {
    console.error(`[Chzzk Category] ✗ Exception:`, error instanceof Error ? error.message : String(error))
    return []
  }
}

/**
 * Get VOD/video list by category ID (game's english_title = Chzzk category)
 *
 * API: GET https://api.chzzk.naver.com/service/v2/categories/GAME/{categoryId}/videos
 *
 * @param categoryId - Chzzk category ID (e.g., "OMORI", "Rimworld")
 * @param size - Number of videos to fetch (default: 20)
 * @param offset - Pagination offset (default: 0)
 * @returns Array of video data
 */
export async function getChzzkVideosByCategory(
  categoryId: string,
  size: number = 20,
  offset: number = 0
): Promise<ChzzkVideoItem[]> {
  if (!categoryId || typeof categoryId !== "string" || categoryId.trim() === "") {
    console.warn("[Chzzk Videos] Skipping invalid categoryId:", JSON.stringify(categoryId))
    return []
  }

  const formattedCategoryId = formatChzzkGameCategoryIdForApi(categoryId)
  const url = `${CHZZK_CATEGORY_VIDEOS_URL(formattedCategoryId)}?size=${size}&offset=${offset}`
  console.log("[Chzzk Request] Fetching category videos:", url)

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: CHZZK_JSON_BROWSER_HEADERS,
      next: { revalidate: REVALIDATE_VOD },
    } as NextFetchOptions)

    const rawText = await response.text()
    if (!response.ok) {
      console.error("[Fetch VODs Error]:", rawText)
      return []
    }

    let dataR: { code?: number; content?: unknown }
    try {
      dataR = JSON.parse(rawText)
    } catch (e) {
      console.error("[Fetch VODs Error] (JSON parse):", e, rawText)
      return []
    }
    if (!dataR || dataR.code !== 200) {
      console.error(`[Fetch VODs Error] (API code):`, dataR?.code, rawText)
      return []
    }

    const items = chzzkListFromContent(dataR.content)
    console.log(`[Chzzk] Fetched ${items.length} videos for category "${formattedCategoryId}".`)

    if (!Array.isArray(items) || items.length === 0) {
      return []
    }

    return items.map((item: any) => ({
      videoNo: item.videoNo ?? 0,
      videoId: item.videoId ?? "",
      videoTitle: item.videoTitle ?? "No Title",
      videoType: item.videoType ?? "UPLOAD",
      publishDate: item.publishDate ?? "",
      thumbnailImageUrl: item.thumbnailImageUrl ?? "",
      duration: Number(item.duration ?? 0),
      readCount: Number(item.readCount ?? 0),
      videoCategory: item.videoCategory ?? formattedCategoryId,
      videoCategoryValue: item.videoCategoryValue ?? "",
      channel: {
        channelId: item.channel?.channelId ?? "",
        channelName: item.channel?.channelName ?? "Unknown",
        channelImageUrl: item.channel?.channelImageUrl ?? "",
      },
    }))
  } catch (error) {
    console.error(`[Chzzk Videos] ✗ Exception:`, error instanceof Error ? error.message : String(error))
    return []
  }
}

/** filterType for clips API */
export type ChzzkClipFilterType = "WITHIN_THIRTY_DAYS" | "WITHIN_SEVEN_DAYS" | "WITHIN_ONE_DAY" | "ALL"
/** orderType for clips API */
export type ChzzkClipOrderType = "POPULAR" | "RECENT"

/**
 * Get clips list by category ID (game's english_title = Chzzk category)
 *
 * API: GET https://api.chzzk.naver.com/service/v1/categories/GAME/{slug}/clips
 *
 * @param categoryId - Chzzk category ID (e.g., "Minecraft", "League_of_Legends")
 * @param filterType - Time filter: WITHIN_THIRTY_DAYS, WITHIN_SEVEN_DAYS, WITHIN_ONE_DAY, ALL
 * @param orderType - Sort: POPULAR (인기순), RECENT (최신순)
 * @param size - Number of clips to fetch (max 50)
 * @returns Array of clip data
 */
export async function getChzzkClipsByCategory(
  categoryId: string,
  filterType: ChzzkClipFilterType = "WITHIN_THIRTY_DAYS",
  orderType: ChzzkClipOrderType = "POPULAR",
  size: number = 50
): Promise<ChzzkClipItem[]> {
  if (!categoryId || typeof categoryId !== "string" || categoryId.trim() === "") {
    console.warn("[Chzzk Clips] Skipping invalid categoryId:", JSON.stringify(categoryId))
    return []
  }

  const formattedCategoryId = formatChzzkGameCategoryIdForApi(categoryId)
  const safeSize = Math.min(50, Math.max(1, size))
  const url = `${CHZZK_CATEGORY_CLIPS_URL(formattedCategoryId)}?filterType=${filterType}&orderType=${orderType}&size=${safeSize}`
  console.log("[Chzzk Request] Fetching category clips:", url)

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: CHZZK_JSON_BROWSER_HEADERS,
      next: { revalidate: REVALIDATE_VOD },
    } as NextFetchOptions)

    const rawText = await response.text()
    if (!response.ok) {
      console.error("[Fetch Clips Error]:", rawText)
      return []
    }

    let dataC: { code?: number; content?: unknown }
    try {
      dataC = JSON.parse(rawText)
    } catch (e) {
      console.error("[Fetch Clips Error] (JSON parse):", e, rawText)
      return []
    }
    if (!dataC || dataC.code !== 200) {
      console.error(`[Fetch Clips Error] (API code):`, dataC?.code, rawText)
      return []
    }

    const items = chzzkListFromContent(dataC.content)
    console.log(`[Chzzk] Fetched ${items.length} clips for category "${formattedCategoryId}".`)

    if (items.length === 0) {
      return []
    }

    return items.map((item: any) => ({
      clipUID: item.clipUID ?? "",
      videoId: item.videoId ?? "",
      clipTitle: item.clipTitle ?? "No Title",
      ownerChannelId: item.ownerChannelId ?? "",
      ownerChannel: {
        channelId: item.ownerChannel?.channelId ?? item.ownerChannelId ?? "",
        channelName: item.ownerChannel?.channelName ?? "Unknown",
        channelImageUrl: item.ownerChannel?.channelImageUrl ?? "",
        verifiedMark: item.ownerChannel?.verifiedMark ?? false,
      },
      thumbnailImageUrl: item.thumbnailImageUrl ?? "",
      clipCategory: item.clipCategory ?? formattedCategoryId,
      duration: Number(item.duration ?? 0),
      adult: Boolean(item.adult),
      createdDate: item.createdDate ?? "",
      readCount: Number(item.readCount ?? 0),
    }))
  } catch (error) {
    console.error(`[Chzzk Clips] ✗ Exception:`, error instanceof Error ? error.message : String(error))
    return []
  }
}

/**
 * Search for live streams on Chzzk by keyword
 * 
 * @param keyword - Search keyword (game title, streamer name, etc.)
 * @param size - Number of results to fetch (default: 20)
 * @returns Array of live stream data
 */
export async function searchChzzkLives(
  keyword: string,
  size: number = 20
): Promise<SearchedStreamData[]> {
  if (keyword == null || (typeof keyword === "string" && keyword.trim() === "")) {
    console.warn("[Chzzk Search] Skipping invalid keyword:", JSON.stringify(keyword))
    return []
  }

  const searchKeyword = typeof keyword === "string" ? keyword.trim() : String(keyword)

  const url = `${CHZZK_SEARCH_LIVES_URL}?keyword=${encodeURIComponent(searchKeyword)}&size=${size}&offset=0`
  console.log("[Chzzk Request] Fetching search:", url)

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: CHZZK_JSON_BROWSER_HEADERS,
      next: { revalidate: REVALIDATE_LIVE },
    } as NextFetchOptions)

    const rawText = await response.text()
    if (!response.ok) {
      console.error("[Fetch Search Lives Error]:", rawText)
      return []
    }

    let data: ChzzkSearchResponse
    try {
      data = JSON.parse(rawText) as ChzzkSearchResponse
    } catch (e) {
      console.error("[Fetch Search Lives Error] (JSON parse):", e, rawText)
      return []
    }

    if (!data) {
      console.error(`[Chzzk Search] ✗ Empty response`)
      return []
    }

    if (data.code !== 200) {
      console.error(`[Chzzk Search] ✗ API Error: Code ${data.code}`)
      return []
    }

    let resultsData: any[] = []
    if (data.content?.data) {
      resultsData = data.content.data
    } else if (data.content && Array.isArray(data.content)) {
      resultsData = data.content
    } else if (Array.isArray(data)) {
      resultsData = data
    }

    console.log(`[Chzzk] Fetched ${resultsData.length} items for "${searchKeyword}".`)
    if (resultsData.length === 0) {
      return []
    }

    const results: SearchedStreamData[] = resultsData
        .filter(item => {
          // Ensure valid data
          if (!item || (!item.channel && !item.live)) return false
          
          // IMPORTANT: Only include GAME category streams
          const liveData = item.live || item
          const categoryType = liveData.categoryType || liveData.category_type
          
          if (categoryType && categoryType !== "GAME") {
            return false
          }
          
          return true
        })
        .map(item => {
          // IMPORTANT: Data is nested in 'live' and 'channel' objects
          const liveData = item.live || item
          const channelData = item.channel || {}

          // Process thumbnail URL ({type} -> 720)
          let thumbnailUrl = liveData.liveImageUrl || 
                            liveData.thumbnailImageUrl || 
                            channelData.channelImageUrl || 
                            ""
          if (thumbnailUrl && thumbnailUrl.includes("{type}")) {
            thumbnailUrl = thumbnailUrl.replace(/{type}/g, "720")
          }

          // Extract fields from nested structure
          const title = liveData.liveTitle || 
                       liveData.title || 
                       channelData.channelName ||
                       "No Title"

          const viewerCount = liveData.concurrentUserCount ?? 
                            liveData.concurrent_user_count ??
                            liveData.viewerCount ??
                            0

          const category = liveData.liveCategoryValue || 
                          liveData.liveCategory || 
                          liveData.categoryValue ||
                          liveData.category ||
                          null

          const openDate = liveData.openDate || 
                          liveData.open_date ||
                          new Date().toISOString()

          const channelId = liveData.channelId || 
                           channelData.channelId || 
                           ""

          const channelName = channelData.channelName || 
                             liveData.channelName || 
                             "Unknown"

          const hasDrops = !!(liveData.dropsCampaignNo ?? liveData.dropsCampaignNos?.length)

          const result = {
            channelId,
            channelName,
            liveTitle: title,
            liveImageUrl: thumbnailUrl,
            concurrentUserCount: viewerCount,
            openDate: openDate,
            category: category,
            hasDrops,
          }

          return result
        })
        .filter(item => item.channelId)
        .sort((a, b) => b.concurrentUserCount - a.concurrentUserCount)

    console.log(`[Chzzk] After GAME filter: ${results.length} streams for "${searchKeyword}".`)
    return results
  } catch (error) {
    console.error(`[Chzzk Search] ✗ Exception:`, error instanceof Error ? error.message : String(error))
    return []
  }
}

/**
 * Find game ID by matching stream category with game titles
 * 
 * @param category - Stream category from Chzzk (e.g., "리그 오브 레전드")
 * @param supabaseClient - Supabase client instance
 * @returns Game ID if found, null otherwise
 */
export async function findGameByCategory(
  category: string | undefined,
  supabaseClient: any
): Promise<number | null> {
  if (!category || !supabaseClient) {
    return null
  }

  try {
    // Strategy 1: Exact match with korean_title (case-insensitive)
    const { data: exactMatch, error: exactError } = await supabaseClient
      .from("games")
      .select("id, title, korean_title")
      .ilike("korean_title", category)
      .limit(1)
      .single()

    if (!exactError && exactMatch) {
      return exactMatch.id
    }

    // Strategy 2: Partial match with korean_title using ILIKE
    const { data: koreanMatches, error: koreanError } = await supabaseClient
      .from("games")
      .select("id, title, korean_title")
      .ilike("korean_title", `%${category}%`)
      .limit(1)

    if (!koreanError && koreanMatches && koreanMatches.length > 0) {
      return koreanMatches[0].id
    }

    // Strategy 3: Partial match with English title using ILIKE
    const { data: englishMatches, error: englishError } = await supabaseClient
      .from("games")
      .select("id, title, korean_title")
      .ilike("title", `%${category}%`)
      .limit(1)

    if (!englishError && englishMatches && englishMatches.length > 0) {
      return englishMatches[0].id
    }

    return null

  } catch (error) {
    console.error(`[Game Mapping] Error searching for game:`, error)
    return null
  }
}

/* ── Popular Korean Streamers for Testing ── */
export const POPULAR_CHZZK_CHANNELS = {
  HANDONG_SOOK: "c1f0a24755fb3e583fb0a588f921c84b", // 한동숙
  PUNGWOL_RYANG: "eb4dbcb2e538c5345e7c3f48c849518d", // 풍월량
  GOEMUL_JUI: "d6cc0b2c6b0d86fb6d0c5e1b8c8f3f3e", // 괴물쥐 (예시 - 실제 ID 확인 필요)
  WAKGOOD: "c6c6fa2e8f1d337c98f27da784e93aa1", // 왁굳 (예시 - 실제 ID 확인 필요)
  KIMCHIMANDU: "9b3c4f8e8e4f8c8f8c8f8c8f8c8f8c8f", // 김치만두 (예시 - 실제 ID 확인 필요)
} as const

/* ── API Error Codes Reference ── */
export const CHZZK_ERROR_CODES = {
  SUCCESS: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
} as const
