import { NextResponse } from "next/server"
import { logCronAgainstHobbyTarget } from "@/lib/cron-hobby-log"
import { updateTopStreamersForAllGames } from "@/lib/actions/update-top-streamers"

/** 게임 수·DB 페이지가 많을 수 있어 여유 (Hobby는 플랜 상한 내에서 조정) */
export const maxDuration = 120

/**
 * 게임별 최근 인기 스트리머 TOP 3 병합 갱신 (일 1회 권장)
 *
 * GET /api/cron/update-top-streamers
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    const authHeader = request.headers.get("authorization")
    const expectedAuth = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null
    if (!expectedAuth || authHeader !== expectedAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const startTime = Date.now()
  try {
    const result = await updateTopStreamersForAllGames()
    const duration = Date.now() - startTime
    return NextResponse.json({
      success: true,
      ...result,
      duration,
    })
  } catch (e) {
    console.error("[update-top-streamers]", e)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: e instanceof Error ? e.message : String(e),
        duration: Date.now() - startTime,
      },
      { status: 500 },
    )
  } finally {
    logCronAgainstHobbyTarget("update-top-streamers", startTime)
  }
}
