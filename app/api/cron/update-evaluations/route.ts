import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { getSteamReviewSummary } from "@/lib/steam"
import { getGameMappings, resolveMapping } from "@/lib/mappings"
import { delay } from "@/lib/utils"
import { searchIGDBGame } from "@/lib/igdb"

/** Steam API에서 "not found" 반환하는 알려진 잘못된 app ID */
const STEAM_SKIP_APP_IDS = new Set([238960, 212200, 495910, 1599340])

/** Vercel serverless timeout: 300초 */
export const maxDuration = 300

/**
 * Cron Job API: 평가 데이터 전용 업데이트 (스팀 평가 + 평론가 점수)
 *
 * GET /api/cron/update-evaluations
 *
 * - 기존 update-steam의 가격/커버/태그 등은 건드리지 않음
 * - steam_review_desc, steam_positive_ratio, steam_total_reviews, critic_score만 갱신
 * - 1일 1회 실행 권장 (Vercel 부하 고려)
 *
 * Query Parameters:
 * - steamLimit: 스팀 평가 가져올 최대 수 (기본 100)
 * - criticLimit: 평론가 점수 가져올 최대 수 (기본 30, IGDB 호출 비용 고려)
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    const authHeader = request.headers.get("authorization")
    const expectedAuth = process.env.CRON_SECRET
      ? `Bearer ${process.env.CRON_SECRET}`
      : null
    if (!expectedAuth || authHeader !== expectedAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const startTime = Date.now()
  const { searchParams } = new URL(request.url)
  const steamLimitParam = searchParams.get("steamLimit")
  const criticLimitParam = searchParams.get("criticLimit")

  const steamLimit = steamLimitParam ? parseInt(steamLimitParam, 10) : 100
  const criticLimit = criticLimitParam ? parseInt(criticLimitParam, 10) : 30

  console.log("[Evaluations] Starting evaluation-only update...")

  try {
    const supabase = createAdminClient()
    const mappings = await getGameMappings()

    const results = { steamUpdated: 0, criticUpdated: 0, failed: 0 }

    // --- 1. 스팀 평가: steam_appid 있음 + 평가 데이터 없음 ---
    const { data: steamGames, error: steamErr } = await supabase
      .from("games")
      .select("id, title, korean_title, english_title, steam_appid")
      .not("steam_appid", "is", null)
      .or("steam_review_desc.is.null,steam_positive_ratio.is.null")
      .limit(steamLimit)

    if (!steamErr && steamGames && steamGames.length > 0) {
      console.log(`[Evaluations] Found ${steamGames.length} games needing Steam reviews`)
      for (const game of steamGames) {
        const appId = game.steam_appid as number
        if (STEAM_SKIP_APP_IDS.has(appId)) continue

        const mapping = resolveMapping(
          mappings,
          game.title?.trim() ?? "",
          (game as { english_title?: string | null }).english_title,
          (game as { korean_title?: string | null }).korean_title
        )
        if (mapping?.skip_steam) continue

        try {
          const summary = await getSteamReviewSummary(appId)
          await delay(500)

          if (summary) {
            const { error: updErr } = await supabase
              .from("games")
              .update({
                steam_review_desc: summary.review_score_desc,
                steam_positive_ratio: summary.steam_positive_ratio,
                steam_total_reviews: summary.steam_total_reviews,
              })
              .eq("id", game.id)

            if (updErr) {
              console.error(`[Evaluations] Steam update failed for ${game.title}:`, updErr.message)
              results.failed++
            } else {
              results.steamUpdated++
            }
          }
        } catch (e) {
          console.error(`[Evaluations] Steam fetch error for ${game.title}:`, e)
          results.failed++
        }
      }
    }

    // --- 2. 평론가 점수: critic_score 없음 (IGDB, skip_igdb 제외) ---
    const { data: criticGames, error: criticErr } = await supabase
      .from("games")
      .select("id, title, korean_title, english_title")
      .is("critic_score", null)
      .limit(criticLimit)

    if (!criticErr && criticGames && criticGames.length > 0) {
      console.log(`[Evaluations] Found ${criticGames.length} games needing critic score`)
      for (const game of criticGames) {
        const mapping = resolveMapping(
          mappings,
          game.title?.trim() ?? "",
          (game as { english_title?: string | null }).english_title,
          (game as { korean_title?: string | null }).korean_title
        )
        if (mapping?.skip_igdb) continue

        const koreanTitle = (game as { korean_title?: string | null }).korean_title?.trim() || null
        const englishTitle = (game as { english_title?: string | null }).english_title?.trim() || null
        const fallbackTitle = game.title?.trim() ?? ""
        const igdbSearchTitle = mapping?.igdb_title ?? null
        const koreanForIGDB = igdbSearchTitle ?? (koreanTitle || (englishTitle ? null : fallbackTitle))
        const englishForIGDB = igdbSearchTitle ?? (englishTitle || fallbackTitle)

        try {
          const igdbData = await searchIGDBGame(koreanForIGDB, englishForIGDB)
          await delay(600)

          if (igdbData?.critic_score != null) {
            const { error: updErr } = await supabase
              .from("games")
              .update({ critic_score: igdbData.critic_score })
              .eq("id", game.id)

            if (updErr) {
              console.error(`[Evaluations] Critic update failed for ${game.title}:`, updErr.message)
              results.failed++
            } else {
              results.criticUpdated++
            }
          }
        } catch (e) {
          console.error(`[Evaluations] IGDB fetch error for ${game.title}:`, e)
          results.failed++
        }
      }
    }

    const duration = Date.now() - startTime
    console.log(`[Evaluations] Done in ${duration}ms: Steam ${results.steamUpdated}, Critic ${results.criticUpdated}, Failed ${results.failed}`)

    return NextResponse.json({
      success: true,
      message: `Steam: ${results.steamUpdated}, Critic: ${results.criticUpdated}`,
      stats: results,
      duration,
    })
  } catch (error) {
    console.error("[Evaluations] Fatal error:", error)
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    )
  }
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
