import { NextResponse } from "next/server"
import { getSidebarSpotlightGames } from "@/lib/sidebar-spotlight"

/** 홈 페이지 ISR과 동일 */
export const revalidate = 60

/**
 * GET /api/sidebar-spotlight
 * 실시간 트렌딩·급상승 게임 상위 3개씩 (비인증 공개)
 */
export async function GET() {
  try {
    const data = await getSidebarSpotlightGames()
    return NextResponse.json(data)
  } catch (e) {
    console.error("[sidebar-spotlight]", e)
    return NextResponse.json({ trending: [], rising: [] }, { status: 200 })
  }
}
