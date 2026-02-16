import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
