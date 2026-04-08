import { NextResponse } from "next/server"
import { logCronAgainstHobbyTarget } from "@/lib/cron-hobby-log"
import { updateTopStreamersForAllGames } from "@/lib/actions/update-top-streamers"

/** Chzzk 보강 호출 포함 시 여유 (타임아웃 시 `?part=0&parts=N` 분할 호출 가능) */
export const maxDuration = 180

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
    const url = new URL(request.url)
    const parts = Math.min(24, Math.max(1, parseInt(url.searchParams.get("parts") ?? "1", 10) || 1))
    const part = Math.min(
      parts - 1,
      Math.max(0, parseInt(url.searchParams.get("part") ?? "0", 10) || 0),
    )

    const result = await updateTopStreamersForAllGames({ part, parts })
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
