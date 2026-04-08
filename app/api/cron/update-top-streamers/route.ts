import { NextResponse } from "next/server"
import { logCronAgainstHobbyTarget } from "@/lib/cron-hobby-log"
import { updateTopStreamersForAllGames } from "@/lib/actions/update-top-streamers"

/** GitHub Actions 단계당 60초 이내 완료를 목표로 함 (게임 수가 매우 많으면 limit 조정 검토) */
/** game_id 목록이 클 때 병렬 배치가 길어질 수 있음 (기본 60초 초과 방지) */
export const maxDuration = 300

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
