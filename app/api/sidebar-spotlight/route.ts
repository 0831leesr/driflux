import { NextResponse } from "next/server"
import { getSidebarSpotlightGamesCached } from "@/lib/sidebar-spotlight"

/** 홈·레이아웃 `unstable_cache`와 동일 주기 */
export const revalidate = 60

/**
 * GET /api/sidebar-spotlight
 * 실시간 트렌딩·급상승 게임 상위 3개씩 (비인증 공개)
 * 레이아웃에서 시드 데이터를 주므로 평시 호출은 적을 것으로 기대.
 */
export async function GET() {
  try {
    const data = await getSidebarSpotlightGamesCached()
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    })
  } catch (e) {
    console.error("[sidebar-spotlight]", e)
    return NextResponse.json({ trending: [], rising: [] }, { status: 200 })
  }
}
