import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** Rate limiting / throttling용 지연 (Promise) */
export const delay = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms))

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format number to Korean Won (원화)
 * @param price - Price in KRW (e.g., 4500000 for 45,000원)
 * @returns Formatted string (e.g., "45,000원" or "무료")
 * Note: Prices are stored as cents (100x actual price), so we divide by 100
 */
export function formatKRW(price: number | null | undefined): string {
  if (price === null || price === undefined) return "가격 정보 없음"
  if (price === 0) return "무료"
  // Divide by 100 to convert from cents to actual KRW
  const actualPrice = Math.round(price / 100)
  return `${actualPrice.toLocaleString("ko-KR")}원`
}

/**
 * Format viewer count
 * @param count - Viewer count
 * @returns Formatted string (e.g., "1,234명" or "1.2K")
 */
export function formatViewerCount(count: number | null | undefined): string {
  if (count === null || count === undefined || count === 0) return "0명"
  
  // Korean style for numbers under 10,000
  if (count < 10000) {
    return `${count.toLocaleString("ko-KR")}명`
  }
  
  // Use "만" for numbers over 10,000
  return `${(count / 10000).toFixed(1)}만명`
}

/**
 * Format viewer count (short version for badges)
 * @param count - Viewer count
 * @returns Short formatted string (e.g., "1.2K" or "234")
 */
export function formatViewerCountShort(count: number | null | undefined): string {
  if (count === null || count === undefined || count === 0) return "0"
  
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  
  return String(count)
}

/**
 * Calculate discount percentage
 * @param original - Original price
 * @param discounted - Discounted price
 * @returns Discount percentage (e.g., 50)
 */
export function calculateDiscountRate(
  original: number | null | undefined,
  discounted: number | null | undefined
): number {
  if (!original || !discounted || original <= discounted) return 0
  return Math.round(((original - discounted) / original) * 100)
}

/**
 * Format discount rate
 * @param rate - Discount rate (0-100)
 * @returns Formatted string (e.g., "-50%")
 */
export function formatDiscountRate(rate: number | null | undefined): string {
  if (!rate || rate <= 0) return ""
  return `-${rate}%`
}

/**
 * 기본 플레이스홀더 이미지 URL (next/image용)
 * via.placeholder.com은 next.config.ts remotePatterns에 등록됨
 */
export const FALLBACK_IMAGE_URL =
  "https://via.placeholder.com/600x400/1a1a1a/ffffff?text=No+Image"

/**
 * 타입별 기본 이미지 경로 (DB에 이미지가 없을 때 fallback)
 * 1순위: local (로컬 파일) → 2순위: remote (placehold.co) - 컴포넌트에서 처리
 */
export const DEFAULT_IMAGES = {
  cover: {
    local: "/images/defaults/cover.png",
    remote: "https://placehold.co/600x900/333/FFF?text=No+Cover",
  },
  header: {
    local: "/images/defaults/header.png",
    remote: "https://placehold.co/460x215/333/FFF?text=No+Header",
  },
  background: {
    local: "/images/defaults/background.png",
    remote: "https://placehold.co/1920x1080/1a1a1a/FFF?text=Background",
  },
} as const

/**
 * 이미지 URL 프로토콜 보정 (// → https:, 유효하지 않으면 placeholder)
 * DB에서 //images.igdb.com... 형태가 내려올 때 INVALID_IMAGE_OPTIMIZE_REQUEST 방지
 */
export function getValidImageUrl(url: string | null | undefined): string {
  if (!url?.trim()) return FALLBACK_IMAGE_URL
  const trimmed = url.trim()
  if (trimmed.startsWith("//")) return `https:${trimmed}`
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed
  }
  return FALLBACK_IMAGE_URL
}

export type GameImageType = "cover" | "header" | "background"

/**
 * 게임 이미지 소스 결정 (url 유효성 검사 + 타입별 fallback)
 * - url이 유효하면(null/undefined/빈문자열 아님) 프로토콜 보정 후 반환
 * - url이 없으면 무조건 DEFAULT_IMAGES[type].local 반환 (2차 폴백은 컴포넌트에서 처리)
 */
export function getGameImageSrc(
  url: string | null | undefined,
  type: keyof typeof DEFAULT_IMAGES
): string {
  if (!url || url.trim() === "") {
    return DEFAULT_IMAGES[type].local
  }
  const trimmed = url.trim()
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`
  }
  return trimmed
}

/**
 * 기본/placeholder 이미지인지 여부 (unoptimized 옵션 판단용)
 */
export function isPlaceholderImage(src: string): boolean {
  const allDefaults = Object.values(DEFAULT_IMAGES).flatMap((v) => [v.local, v.remote])
  return (allDefaults as string[]).includes(src) || src === FALLBACK_IMAGE_URL
}

/**
 * header_image_url 또는 cover_image_url 중 유효한 것을 선택하여 이미지 src 반환
 * (기존 header/cover 2파라미터 패턴 호환용)
 */
export function getBestGameImage(
  headerImageUrl?: string | null,
  coverImageUrl?: string | null,
  type: GameImageType = "header"
): string {
  const url = headerImageUrl?.trim() || coverImageUrl?.trim()
  return getGameImageSrc(url || null, type)
}
