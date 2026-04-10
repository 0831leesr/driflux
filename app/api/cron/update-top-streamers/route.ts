import { NextResponse } from "next/server"
import { logCronAgainstHobbyTarget } from "@/lib/cron-hobby-log"
import { updateTopStreamersForAllGames } from "@/lib/actions/update-top-streamers"

/**
 * Vercel Hobby: 단일 호출은 보통 60초 이내가 안전. 전체 갱신은 분할 호출 권장.
 * 예: parts=6 이면 part=0..5 를 6회 순차(또는 stagger) 호출 — 각 응답의 subsetCount 확인.
 * Pro/Fluid에서 상한이 더 크면 이 값을 올려도 됩니다.
 */
export const maxDuration = 60

/**
 * 게임별 최근 인기 스트리머 TOP 3 병합 갱신 (일 1회 권장)
 *
 * GET /api/cron/update-top-streamers
 *
 * Query:
 * - `part` / `parts` — 균등 분할 (Hobby 타임아웃 회피). 예: `?part=0&parts=6` … `part=5&parts=6`
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
