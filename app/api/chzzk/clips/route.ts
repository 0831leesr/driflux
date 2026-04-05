import { NextRequest, NextResponse } from "next/server"
import {
  getChzzkClipsByCategory,
  type ChzzkClipFilterType,
  type ChzzkClipOrderType,
} from "@/lib/chzzk"

const FILTER_VALUES: ChzzkClipFilterType[] = [
  "WITHIN_THIRTY_DAYS",
  "WITHIN_SEVEN_DAYS",
  "WITHIN_ONE_DAY",
  "ALL",
]
const ORDER_VALUES: ChzzkClipOrderType[] = ["POPULAR", "RECENT"]

/**
 * GET /api/chzzk/clips?categoryId=Minecraft&filterType=WITHIN_THIRTY_DAYS&orderType=POPULAR&size=50
 * Fetches clip list for a Chzzk game category.
 */
export async function GET(request: NextRequest) {
  // Public proxy: anonymous pages depend on this (no getUser).
  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get("categoryId")?.trim()
  const filterType = (searchParams.get("filterType") ?? "WITHIN_THIRTY_DAYS") as ChzzkClipFilterType
  const orderType = (searchParams.get("orderType") ?? "POPULAR") as ChzzkClipOrderType
  const size = Math.min(50, Math.max(1, parseInt(searchParams.get("size") ?? "50", 10) || 50))

  if (!categoryId) {
    return NextResponse.json(
      { error: "categoryId is required" },
      { status: 400 }
    )
  }

  const safeFilter: ChzzkClipFilterType = FILTER_VALUES.includes(filterType)
    ? filterType
    : "WITHIN_THIRTY_DAYS"
  const safeOrder: ChzzkClipOrderType = ORDER_VALUES.includes(orderType)
    ? orderType
    : "POPULAR"

  try {
    const clips = await getChzzkClipsByCategory(
      categoryId,
      safeFilter,
      safeOrder,
      size
    )
    return NextResponse.json({ clips })
  } catch (error) {
    console.error("[API chzzk/clips] Error:", error)
    return NextResponse.json({ clips: [] })
  }
}
