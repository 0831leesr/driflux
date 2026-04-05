import { NextRequest, NextResponse } from "next/server"
import {
  getChzzkVideosByCategory,
  type ChzzkClipFilterType,
  type ChzzkClipOrderType,
  type ChzzkVideoPageCursor,
} from "@/lib/chzzk"

const FILTER_VALUES: ChzzkClipFilterType[] = [
  "WITHIN_THIRTY_DAYS",
  "WITHIN_SEVEN_DAYS",
  "WITHIN_ONE_DAY",
  "ALL",
]
const ORDER_VALUES: ChzzkClipOrderType[] = ["POPULAR", "RECENT"]

function parseCursor(searchParams: URLSearchParams): ChzzkVideoPageCursor | null {
  const pub = searchParams.get("publishDateAt")
  const rc = searchParams.get("readCount")
  if (pub == null || rc == null) return null
  const publishDateAt = Number(pub)
  const readCount = Number(rc)
  if (!Number.isFinite(publishDateAt) || !Number.isFinite(readCount)) return null
  return { publishDateAt, readCount }
}

/**
 * GET /api/chzzk/videos?categoryId=...&size=20&filterType=...&orderType=...
 * 다음 페이지: 응답의 `nextCursor`를 `publishDateAt`, `readCount` 쿼리로 전달 (offset 미사용·무시됨).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get("categoryId")?.trim()
  const size = Math.min(50, Math.max(1, parseInt(searchParams.get("size") ?? "20", 10) || 20))
  const filterType = (searchParams.get("filterType") ?? "WITHIN_THIRTY_DAYS") as ChzzkClipFilterType
  const orderType = (searchParams.get("orderType") ?? "POPULAR") as ChzzkClipOrderType

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

  const cursor = parseCursor(searchParams)

  try {
    const { videos, nextCursor } = await getChzzkVideosByCategory(
      categoryId,
      size,
      safeFilter,
      safeOrder,
      cursor
    )
    return NextResponse.json({ videos, nextCursor, source: "api" as const })
  } catch (error) {
    console.error("[API chzzk/videos] Error:", error)
    return NextResponse.json({ videos: [], nextCursor: null, source: "error" as const })
  }
}
