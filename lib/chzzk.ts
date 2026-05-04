/**
 * Chzzk (치지직) Live Streaming API Integration
 * 
 * Chzzk API Documentation:
 * https://api.chzzk.naver.com/service/v1/channels/{channelId}/live-detail
 */

import { unstable_cache } from "next/cache"
import { delay } from "@/lib/utils"
import { sortChzzkVodList } from "@/lib/chzzk-vod-order"

/** Next.js fetch 확장 옵션 (revalidate 등) */
type NextFetchOptions = RequestInit & { next?: { revalidate?: number } }

/** 개발 또는 DEBUG_CHZZK=1 일 때만 상세 log/warn (Vercel Hobby 로그 비용·노이즈 절감) */
const CHZZK_DEBUG_LOGS =
  process.env.NODE_ENV === "development" || process.env.DEBUG_CHZZK === "1"

function chzzkDbg(...args: unknown[]) {
  if (CHZZK_DEBUG_LOGS) console.log(...args)
}

const chzzkNativeWarn = console.warn.bind(console)

function chzzkDbgWarn(...args: unknown[]) {
  if (CHZZK_DEBUG_LOGS) chzzkNativeWarn(...args)
}

function chzzkTruncateErrBody(s: string, max = 400): string {
  if (CHZZK_DEBUG_LOGS) return s
  if (s.length <= max) return s
  return `${s.slice(0, max)}…`
}

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
  /** 채널 프로필 이미지 (스트리머 아바타) */
  channelImageUrl?: string
}

/** Chzzk CDN URLs often contain `{type}`; replace with pixel size (e.g. 1080 stream poster, 200 avatar). */
function resolveChzzkTemplateImageUrl(url: string | null | undefined, typeSize: string): string {
  const u = (url ?? "").trim()
  if (!u) return ""
  return u.includes("{type}") ? u.replace(/{type}/g, typeSize) : u
}

/** 카테고리 lives 항목 → 프로필 URL(없으면 썸네일 `{type}`→200) */
function pickChzzkCategoryLiveProfileUrl(item: Record<string, unknown> | null | undefined): string {
  if (!item || typeof item !== "object") return ""
  const ch = item.channel as Record<string, unknown> | undefined
  const rawFromChannel =
    (typeof ch?.channelImageUrl === "string" && ch.channelImageUrl.trim()) ||
    (typeof ch?.channel_image_url === "string" && ch.channel_image_url.trim()) ||
    ""
  const rawTop =
    (typeof item.channelImageUrl === "string" && item.channelImageUrl.trim()) ||
    (typeof item.channel_image_url === "string" && item.channel_image_url.trim()) ||
    ""
  const live = item.live as Record<string, unknown> | undefined
  const liveCh = live?.channel as Record<string, unknown> | undefined
  const rawLiveNested =
    (typeof liveCh?.channelImageUrl === "string" && liveCh.channelImageUrl.trim()) ||
    (typeof liveCh?.channel_image_url === "string" && liveCh.channel_image_url.trim()) ||
    ""

  const resolved = resolveChzzkTemplateImageUrl(
    rawFromChannel || rawTop || rawLiveNested,
    "200",
  )
  if (resolved) return resolved

  const thumb =
    (typeof item.liveImageUrl === "string" && item.liveImageUrl.trim()) ||
    (typeof item.defaultThumbnailImageUrl === "string" && item.defaultThumbnailImageUrl.trim()) ||
    ""
  if (!thumb) return ""
  return thumb.includes("{type}") ? thumb.replace(/{type}/g, "200") : thumb
}

export type GetChzzkCategoryLivesOptions = {
  /** 크론 등에서 `fetch` Data Cache 비활성화 */
  bypassNextFetchCache?: boolean
}

/** 다시보기 영상 API 응답 아이템 */
export interface ChzzkVideoItem {
  videoNo: number
  videoId: string
  videoTitle: string
  videoType: string
  publishDate: string
  /** API 밀리초 타임스탬프 (정렬·최신순에 사용) */
  publishDateAt?: number
  thumbnailImageUrl: string
  duration: number
  readCount: number
  /** 라이브 VOD 시청자 지표 등 (인기순 보조 키) */
  livePv?: number
  videoCategory: string
  videoCategoryValue: string
  channel: {
    channelId: string
    channelName: string
    channelImageUrl: string
  }
}

/** filterType for clips API & game category VOD (v2 /videos) — 동일 enum */
export type ChzzkClipFilterType = "WITHIN_THIRTY_DAYS" | "WITHIN_SEVEN_DAYS" | "WITHIN_ONE_DAY" | "ALL"
/** orderType for clips API & game category VOD (v2 /videos) — 동일 enum */
export type ChzzkClipOrderType = "POPULAR" | "RECENT"

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
  chzzkDbg("[Chzzk Fetch Request URL]:", url)

  const response = await fetch(url, {
    method: "GET",
    headers: CHZZK_JSON_BROWSER_HEADERS,
    ...extraInit,
  } as NextFetchOptions)

  const rawText = await response.text()
  chzzkDbg("[Chzzk Raw Response]:", rawText.slice(0, 300))

  if (!response.ok) {
    console.error(
      `[Chzzk] HTTP ${response.status} — body prefix:`,
      chzzkTruncateErrBody(rawText, 1000),
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
      chzzkTruncateErrBody(rawText, 500),
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

  const categories = chzzkListFromContent(raw?.content) as ChzzkLiveCategoryItem[]

  return {
    categories,
    rawText,
    parseError: null,
    parsed,
    httpOk: true,
    httpStatus: response.status,
  }
}

/**
 * service/v1/lives(POPULAR) 응답 행 → categories/live와 동형의 게임 카테고리 목록으로 집계
 * (데이터센터·차단 등으로 categories/live가 빈 배열일 때 update-daily-stats 폴백용)
 */
function aggregateChzzkLivesRowsToCategoryItems(rows: Record<string, unknown>[]): ChzzkLiveCategoryItem[] {
  const map = new Map<
    string,
    { categoryValue: string; viewers: number; streams: number; poster: string | null }
  >()

  for (const row of rows) {
    const catType = row.categoryType
    if (typeof catType === "string" && catType !== "GAME") continue

    const cid = String(row.liveCategory ?? "").trim()
    if (!cid) continue

    const cval = String(row.liveCategoryValue ?? "").trim()
    const v = Number(row.concurrentUserCount ?? 0) || 0
    const posterRaw = row.liveImageUrl
    const poster = typeof posterRaw === "string" ? posterRaw : null

    const prev = map.get(cid)
    if (!prev) {
      map.set(cid, { categoryValue: cval || cid, viewers: v, streams: 1, poster })
    } else {
      prev.viewers += v
      prev.streams += 1
      if (!prev.categoryValue && cval) prev.categoryValue = cval
    }
  }

  return [...map.entries()]
    .map(([categoryId, a]) => ({
      categoryId,
      categoryValue: a.categoryValue,
      concurrentUserCount: a.viewers,
      openLiveCount: a.streams,
      posterImageUrl: a.poster,
    }))
    .sort((x, y) => y.concurrentUserCount - x.concurrentUserCount)
}

/** categories/live가 비었을 때 치지직 인기 라이브 목록으로 동일 스키마 카테고리 생성 */
export async function fetchAggregatedGameCategoriesFromChzzkLives(
  extraInit: NextFetchOptions = {},
): Promise<ChzzkLiveCategoryItem[]> {
  const url = buildChzzkServiceV1LivesUrl()
  chzzkDbg("[Chzzk] lives POPULAR fallback:", url)

  const r = await fetchChzzkCategoriesLiveTextFirst(url, { ...extraInit })

  if (!r.httpOk || r.parseError || !r.parsed) {
    chzzkDbgWarn("[Chzzk] lives fallback: unusable response", {
      httpOk: r.httpOk,
      parseError: r.parseError,
    })
    return []
  }

  const raw = r.parsed as Record<string, unknown>
  if (typeof raw.code === "number" && raw.code !== 200) {
    chzzkDbgWarn("[Chzzk] lives fallback: body code", raw.code)
    return []
  }

  const rows = chzzkListFromContent(raw.content) as Record<string, unknown>[]
  const aggregated = aggregateChzzkLivesRowsToCategoryItems(rows)
  chzzkDbg(`[Chzzk] lives fallback: ${rows.length} rows → ${aggregated.length} categories`)
  return aggregated
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
      chzzkDbgWarn(`[Chzzk API] Skipping invalid channelId:`, JSON.stringify(channelId))
      return createOfflineStatus("")
    }

    const trimmedId = channelId.trim()
    const url = `${CHZZK_API_BASE}/polling/v2/channels/${trimmedId}/live-status`
    chzzkDbg("[Chzzk Request] Fetching:", url)

    const response = await fetch(url, {
      method: "GET",
      headers: CHZZK_JSON_BROWSER_HEADERS,
      next: { revalidate: 60 }, // Cache for 1 minute (live data changes frequently)
    } as NextFetchOptions)

    const rawText = await response.text()
    if (!response.ok) {
      if (response.status === 404) {
        chzzkDbgWarn(`[Chzzk API] 404 Not Found (channel may not exist): ${url}`)
      } else {
        console.error(`[Chzzk API] ✗ HTTP Error: ${response.status} ${response.statusText}`)
        console.error(`[Chzzk API] Error Response Body:`, chzzkTruncateErrBody(rawText))
      }
      chzzkDbgWarn(`[Chzzk API] Returning offline status (soft fail)`)
      return createOfflineStatus(trimmedId)
    }

    let data: ChzzkApiResponse
    try {
      data = JSON.parse(rawText) as ChzzkApiResponse
    } catch (e) {
      console.error(`[Chzzk API] JSON parse failed:`, e)
      console.error(`[Chzzk API] Raw:`, chzzkTruncateErrBody(rawText))
      return createOfflineStatus(trimmedId)
    }

    // Check API response code
    if (!data || typeof data.code === 'undefined') {
      console.error(`[Chzzk API] ✗ Invalid response structure (no code field)`)
      console.error(`[Chzzk API] Response keys:`, Object.keys(data || {}))
      chzzkDbgWarn(`[Chzzk API] Returning offline status to prevent cron failure`)
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
      
      chzzkDbgWarn(`[Chzzk API] Returning offline status to prevent cron failure`)
      return createOfflineStatus(trimmedId)
    }

    if (!data.content) {
      chzzkDbgWarn(`[Chzzk API] ✗ Content is null (channel may not exist or be private)`)
      chzzkDbgWarn(`[Chzzk API] Returning offline status to prevent cron failure`)
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
      chzzkDbgWarn(`[Chzzk API] ⚠ liveImageUrl is null, using default thumbnail`)
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
    console.error(
      `[Chzzk API] ✗ Exception channel ${channelId}:`,
      error instanceof Error ? error.message : String(error),
    )
    if (CHZZK_DEBUG_LOGS) {
      console.error(`[Chzzk API] Error Type:`, error instanceof Error ? error.constructor.name : typeof error)
      console.error(`[Chzzk API] Error Stack:`, error instanceof Error ? error.stack : "N/A")
    }
    chzzkDbgWarn(`[Chzzk API] Returning offline status to prevent cron failure`)
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
    chzzkDbg("[Chzzk Request] Fetching live categories:", url)

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

    chzzkDbg(`[Chzzk] Fetched ${categories.length} live categories, returning ${result.length}.`)
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
 * 캐싱: `unstable_cache`(60초) + 내부 fetch `next.revalidate`(60초)
 *
 * @param size - 반환할 게임 수 (기본: 50, 최대: 50)
 * @returns 시청자 수 내림차순 정렬된 TopLiveGame 배열
 */
async function fetchTopLiveGamesUncached(size: number = 50): Promise<TopLiveGame[]> {
  try {
    const capped = Math.min(Math.max(Number(size) || 50, 1), 50)
    const topUrl = buildChzzkCategoriesLiveUrl()
    chzzkDbg("[Chzzk Request] Fetching top live games:", topUrl)

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
      chzzkDbgWarn("[Chzzk TopLiveGames] Empty response")
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
      .slice(0, capped)

    chzzkDbg(`[Chzzk] getTopLiveGames: returning ${result.length} games (top by viewers).`)
    return result
  } catch (error) {
    console.error("[Chzzk TopLiveGames] ✗ Exception:", error instanceof Error ? error.message : String(error))
    return []
  }
}

export const getTopLiveGames = unstable_cache(fetchTopLiveGamesUncached, ["chzzk-getTopLiveGames"], {
  revalidate: REVALIDATE_LIVE,
})

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
      // 카테고리 미존재(404)는 흔함 — error 대신 warn으로 노이즈 감소
      if (response.status === 404) {
        try {
          const j = JSON.parse(rawText) as { code?: number; message?: string }
          if (j.code === 404 || /찾을 수 없/.test(String(j.message ?? ""))) {
            console.warn(`[Chzzk Poster] 404 (no category): ${formattedCategoryId}`)
            return null
          }
        } catch {
          console.warn(`[Chzzk Poster] 404 (no category): ${formattedCategoryId}`)
          return null
        }
      }
      console.error("[Fetch Game Poster Error]:", chzzkTruncateErrBody(rawText))
      return null
    }

    let data: { content?: { posterImageUrl?: string }; posterImageUrl?: string }
    try {
      data = JSON.parse(rawText)
    } catch (e) {
      console.error("[Fetch Game Poster Error] (JSON parse):", e, chzzkTruncateErrBody(rawText))
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
 * GAME 카테고리 라이브 목록 (v2 …/categories/GAME/{id}/lives)
 */
export async function getChzzkStreamsByCategory(
  categoryId: string,
  options?: GetChzzkCategoryLivesOptions,
): Promise<SearchedStreamData[]> {
  if (!categoryId || typeof categoryId !== "string" || categoryId.trim() === "") {
    chzzkDbgWarn("[Chzzk Category] Skipping invalid categoryId:", JSON.stringify(categoryId))
    return []
  }

  const formattedCategoryId = formatChzzkGameCategoryIdForApi(categoryId)
  const url = CHZZK_CATEGORY_LIVES_URL(formattedCategoryId)
  chzzkDbg("[Chzzk Request] Fetching category lives:", url)

  try {
    const bypass = options?.bypassNextFetchCache === true
    const response = await fetch(
      url,
      bypass
        ? ({
            method: "GET",
            headers: CHZZK_JSON_BROWSER_HEADERS,
            cache: "no-store",
          } as RequestInit)
        : ({
            method: "GET",
            headers: CHZZK_JSON_BROWSER_HEADERS,
            next: { revalidate: REVALIDATE_LIVE },
          } as NextFetchOptions),
    )

    const rawText = await response.text()
    if (!response.ok) {
      console.error("[Fetch Lives Error]:", chzzkTruncateErrBody(rawText))
      return []
    }

    let dataL: { code?: number; content?: unknown }
    try {
      dataL = JSON.parse(rawText)
    } catch (e) {
      console.error("[Fetch Lives Error] (JSON parse):", e, chzzkTruncateErrBody(rawText))
      return []
    }
    if (!dataL || dataL.code !== 200) {
      console.error(`[Fetch Lives Error] (API code):`, dataL?.code, chzzkTruncateErrBody(rawText))
      return []
    }

    const items = chzzkListFromContent(dataL.content)
    chzzkDbg(`[Chzzk] Fetched ${items.length} streams for category "${formattedCategoryId}".`)

    if (items.length === 0) {
      return []
    }

    const results: SearchedStreamData[] = items
      .filter((item: any) => !!(item?.channel?.channelId ?? item?.channelId))
      .map((item: any) => {
        const channelId = String(item.channel?.channelId ?? item.channelId ?? "").trim()
        const channelName = item.channel?.channelName ?? item.channelName ?? "Unknown"
        let thumbnailUrl = item.liveImageUrl ?? ""
        if (thumbnailUrl && thumbnailUrl.includes("{type}")) {
          thumbnailUrl = thumbnailUrl.replace(/{type}/g, "1080")
        }
        const hasDrops = !!(item.dropsCampaignNo ?? item.dropsCampaignNos?.length)
        const channelImageUrl = pickChzzkCategoryLiveProfileUrl(item as Record<string, unknown>)
        return {
          channelId,
          channelName,
          liveTitle: item.liveTitle ?? item.title ?? "No Title",
          liveImageUrl: thumbnailUrl,
          concurrentUserCount: Number(item.concurrentUserCount ?? 0),
          openDate: item.openDate ?? new Date().toISOString(),
          category: item.liveCategoryValue ?? item.liveCategory ?? formattedCategoryId,
          hasDrops,
          ...(channelImageUrl ? { channelImageUrl } : {}),
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

/** v2 /videos 다음 페이지 — `offset`은 API에서 무시됨(검증됨). 응답 `content.page.next`만 사용 */
export type ChzzkVideoPageCursor = { publishDateAt: number; readCount: number }

export type ChzzkVideoCategoryResult = {
  videos: ChzzkVideoItem[]
  nextCursor: ChzzkVideoPageCursor | null
}

function chzzkVideoNextCursorFromContent(content: unknown): ChzzkVideoPageCursor | null {
  if (!content || typeof content !== "object") return null
  const next = (content as { page?: { next?: { publishDateAt?: number; readCount?: number } | null } })
    .page?.next
  if (!next || typeof next.publishDateAt !== "number" || Number.isNaN(next.publishDateAt)) return null
  return { publishDateAt: next.publishDateAt, readCount: Number(next.readCount ?? 0) }
}

/**
 * Get VOD/video list by category ID (game's english_title = Chzzk category)
 *
 * API: GET https://api.chzzk.naver.com/service/v2/categories/GAME/{categoryId}/videos
 *
 * **페이지네이션**: `offset` 미지원(같은 첫 페이지 반복). 이전 응답 `nextCursor`로
 * `publishDateAt`·`readCount` 쿼리를 붙여 다음 구간을 요청해야 함.
 *
 * @param cursor - 첫 요청은 null, 이후 `result.nextCursor`
 */
export async function getChzzkVideosByCategory(
  categoryId: string,
  size: number = 20,
  filterType: ChzzkClipFilterType = "WITHIN_THIRTY_DAYS",
  orderType: ChzzkClipOrderType = "POPULAR",
  cursor: ChzzkVideoPageCursor | null = null
): Promise<ChzzkVideoCategoryResult> {
  const empty: ChzzkVideoCategoryResult = { videos: [], nextCursor: null }

  if (!categoryId || typeof categoryId !== "string" || categoryId.trim() === "") {
    chzzkDbgWarn("[Chzzk Videos] Skipping invalid categoryId:", JSON.stringify(categoryId))
    return empty
  }

  const formattedCategoryId = formatChzzkGameCategoryIdForApi(categoryId)
  const safeSize = Math.min(50, Math.max(1, size))
  let url = `${CHZZK_CATEGORY_VIDEOS_URL(formattedCategoryId)}?size=${safeSize}&filterType=${filterType}&orderType=${orderType}`
  if (cursor && Number.isFinite(cursor.publishDateAt)) {
    url += `&publishDateAt=${cursor.publishDateAt}&readCount=${cursor.readCount}`
  }
  chzzkDbg("[Chzzk Request] Fetching category videos:", url)

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: CHZZK_JSON_BROWSER_HEADERS,
      next: { revalidate: REVALIDATE_VOD },
    } as NextFetchOptions)

    const rawText = await response.text()
    if (!response.ok) {
      console.error("[Fetch VODs Error]:", chzzkTruncateErrBody(rawText))
      return empty
    }

    let dataR: { code?: number; content?: unknown }
    try {
      dataR = JSON.parse(rawText)
    } catch (e) {
      console.error("[Fetch VODs Error] (JSON parse):", e, chzzkTruncateErrBody(rawText))
      return empty
    }
    if (!dataR || dataR.code !== 200) {
      console.error(`[Fetch VODs Error] (API code):`, dataR?.code, chzzkTruncateErrBody(rawText))
      return empty
    }

    const items = chzzkListFromContent(dataR.content)
    const nextCursor = chzzkVideoNextCursorFromContent(dataR.content)
    chzzkDbg(`[Chzzk] Fetched ${items.length} videos for category "${formattedCategoryId}".`)

    if (!Array.isArray(items) || items.length === 0) {
      return { videos: [], nextCursor: null }
    }

    const mapped = items.map((item: any) => {
      const publishDateAtRaw = Number(item.publishDateAt)
      const livePvRaw = Number(item.livePv)
      return {
        videoNo: item.videoNo ?? 0,
        videoId: item.videoId ?? "",
        videoTitle: item.videoTitle ?? "No Title",
        videoType: item.videoType ?? "UPLOAD",
        publishDate: item.publishDate ?? "",
        publishDateAt:
          Number.isFinite(publishDateAtRaw) && publishDateAtRaw > 0 ? publishDateAtRaw : undefined,
        thumbnailImageUrl: item.thumbnailImageUrl ?? "",
        duration: Number(item.duration ?? 0),
        readCount: Number(item.readCount ?? 0),
        livePv: Number.isFinite(livePvRaw) ? livePvRaw : 0,
        videoCategory: item.videoCategory ?? formattedCategoryId,
        videoCategoryValue: item.videoCategoryValue ?? "",
        channel: {
          channelId: item.channel?.channelId ?? "",
          channelName: item.channel?.channelName ?? "Unknown",
          channelImageUrl: item.channel?.channelImageUrl ?? "",
        },
      }
    })
    return {
      videos: sortChzzkVodList(mapped, orderType),
      nextCursor,
    }
  } catch (error) {
    console.error(`[Chzzk Videos] ✗ Exception:`, error instanceof Error ? error.message : String(error))
    return empty
  }
}

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
    chzzkDbgWarn("[Chzzk Clips] Skipping invalid categoryId:", JSON.stringify(categoryId))
    return []
  }

  const formattedCategoryId = formatChzzkGameCategoryIdForApi(categoryId)
  const safeSize = Math.min(50, Math.max(1, size))
  const url = `${CHZZK_CATEGORY_CLIPS_URL(formattedCategoryId)}?filterType=${filterType}&orderType=${orderType}&size=${safeSize}`
  chzzkDbg("[Chzzk Request] Fetching category clips:", url)

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: CHZZK_JSON_BROWSER_HEADERS,
      next: { revalidate: REVALIDATE_VOD },
    } as NextFetchOptions)

    const rawText = await response.text()
    if (!response.ok) {
      console.error("[Fetch Clips Error]:", chzzkTruncateErrBody(rawText))
      return []
    }

    let dataC: { code?: number; content?: unknown }
    try {
      dataC = JSON.parse(rawText)
    } catch (e) {
      console.error("[Fetch Clips Error] (JSON parse):", e, chzzkTruncateErrBody(rawText))
      return []
    }
    if (!dataC || dataC.code !== 200) {
      console.error(`[Fetch Clips Error] (API code):`, dataC?.code, chzzkTruncateErrBody(rawText))
      return []
    }

    const items = chzzkListFromContent(dataC.content)
    chzzkDbg(`[Chzzk] Fetched ${items.length} clips for category "${formattedCategoryId}".`)

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
    chzzkDbgWarn("[Chzzk Search] Skipping invalid keyword:", JSON.stringify(keyword))
    return []
  }

  const searchKeyword = typeof keyword === "string" ? keyword.trim() : String(keyword)

  const url = `${CHZZK_SEARCH_LIVES_URL}?keyword=${encodeURIComponent(searchKeyword)}&size=${size}&offset=0`
  chzzkDbg("[Chzzk Request] Fetching search:", url)

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: CHZZK_JSON_BROWSER_HEADERS,
      next: { revalidate: REVALIDATE_LIVE },
    } as NextFetchOptions)

    const rawText = await response.text()
    if (!response.ok) {
      console.error("[Fetch Search Lives Error]:", chzzkTruncateErrBody(rawText))
      return []
    }

    let data: ChzzkSearchResponse
    try {
      data = JSON.parse(rawText) as ChzzkSearchResponse
    } catch (e) {
      console.error("[Fetch Search Lives Error] (JSON parse):", e, chzzkTruncateErrBody(rawText))
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

    chzzkDbg(`[Chzzk] Fetched ${resultsData.length} items for "${searchKeyword}".`)
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

          const channelImageUrl = resolveChzzkTemplateImageUrl(channelData.channelImageUrl, "200")

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
            ...(channelImageUrl ? { channelImageUrl } : {}),
          }

          return result
        })
        .filter(item => item.channelId)
        .sort((a, b) => b.concurrentUserCount - a.concurrentUserCount)

    chzzkDbg(`[Chzzk] After GAME filter: ${results.length} streams for "${searchKeyword}".`)
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
