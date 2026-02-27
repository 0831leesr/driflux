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

/* ── Constants ── */
export const CHZZK_API_BASE = "https://api.chzzk.naver.com"
const CHZZK_SERVICE_V1 = `${CHZZK_API_BASE}/service/v1`
const CHZZK_SERVICE_V2 = `${CHZZK_API_BASE}/service/v2`
export const CHZZK_SEARCH_LIVES_URL = `${CHZZK_SERVICE_V1}/search/lives`
export const CHZZK_CATEGORY_LIVES_URL = (categoryId: string) =>
  `${CHZZK_SERVICE_V2}/categories/GAME/${encodeURIComponent(categoryId)}/lives`
export const CHZZK_CATEGORY_VIDEOS_URL = (categoryId: string) =>
  `${CHZZK_SERVICE_V2}/categories/GAME/${encodeURIComponent(categoryId)}/videos`
const RATE_LIMIT_DELAY = 1000 // 1초 (치지직 API Rate Limit 고려)
const DEFAULT_THUMBNAIL_SIZE = "720" // 썸네일 해상도 (480, 720, 1080 등)
const DEFAULT_THUMBNAIL_URL = "https://via.placeholder.com/1280x720/1a1a1a/ffffff?text=No+Thumbnail" // Fallback thumbnail

// Polling API는 봇 차단이 덜하므로 service/v1 대신 polling/v2 사용
// User-Agent는 여전히 최신 Chrome으로 유지
const BROWSER_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"

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
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://chzzk.naver.com/",
      },
      next: { revalidate: 60 }, // Cache for 1 minute (live data changes frequently)
    } as NextFetchOptions)

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[Chzzk API] 404 Not Found (channel may not exist): ${url}`)
      } else {
        console.error(`[Chzzk API] ✗ HTTP Error: ${response.status} ${response.statusText}`)
        const errorText = await response.text()
        console.error(`[Chzzk API] Error Response Body:`, errorText.substring(0, 1000))
      }
      console.warn(`[Chzzk API] Returning offline status (soft fail)`)
      return createOfflineStatus(trimmedId)
    }

    const data: ChzzkApiResponse = await response.json()

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
    const url = `${CHZZK_SERVICE_V1}/categories/live?categoryType=GAME&size=50&sort=POPULAR`
    console.log("[Chzzk Request] Fetching live categories:", url)

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        "Accept": "application/json",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://chzzk.naver.com/",
      },
      cache: "no-store", // No Cache
    })

    if (!response.ok) {
      console.error(`[Chzzk Categories] ✗ HTTP Error: ${response.status}`)
      throw new Error(`Chzzk API Error: ${response.status}`)
    }

    const json = await response.json()
    const items = json.content?.data ?? []

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

  const trimmedId = categoryId.trim()
  const url = CHZZK_CATEGORY_LIVES_URL(trimmedId)
  console.log("[Chzzk Request] Fetching category lives:", url)

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://chzzk.naver.com/",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[Chzzk Category] 404 Not Found: ${url}`)
      } else {
        console.error(`[Chzzk Category] ✗ HTTP Error: ${response.status}`)
        const errorText = await response.text()
        console.error(`[Chzzk Category] Error Body:`, errorText.substring(0, 500))
      }
      return []
    }

    const data = await response.json()
    if (!data || data.code !== 200) {
      console.error(`[Chzzk Category] ✗ API Error: code=${data?.code}`)
      return []
    }

    const items = data.content?.data ?? data.content ?? []
    console.log(`[Chzzk] Fetched ${items.length} streams for category "${trimmedId}".`)

    if (!Array.isArray(items) || items.length === 0) {
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
          category: item.liveCategoryValue ?? item.liveCategory ?? trimmedId,
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

  const trimmedId = categoryId.trim()
  const url = `${CHZZK_CATEGORY_VIDEOS_URL(trimmedId)}?size=${size}&offset=${offset}`
  console.log("[Chzzk Request] Fetching category videos:", url)

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://chzzk.naver.com/",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[Chzzk Videos] 404 Not Found: ${url}`)
      } else {
        console.error(`[Chzzk Videos] ✗ HTTP Error: ${response.status}`)
        const errorText = await response.text()
        console.error(`[Chzzk Videos] Error Body:`, errorText.substring(0, 500))
      }
      return []
    }

    const data = await response.json()
    if (!data || data.code !== 200) {
      console.error(`[Chzzk Videos] ✗ API Error: code=${data?.code}`)
      return []
    }

    const items = data.content?.data ?? []
    console.log(`[Chzzk] Fetched ${items.length} videos for category "${trimmedId}".`)

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
      videoCategory: item.videoCategory ?? trimmedId,
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
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://chzzk.naver.com/",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[Chzzk Search] 404 Not Found (soft fail):`, url)
      } else {
        console.error(`[Chzzk Search] ✗ HTTP Error: ${response.status}`)
        const errorText = await response.text()
        console.error(`[Chzzk Search] Error Body:`, errorText.substring(0, 500))
      }
      return []
    }

    const data: ChzzkSearchResponse = await response.json()

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
