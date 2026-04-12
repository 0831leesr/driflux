import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { fetchTopAnticipatedGames } from "@/lib/igdb"
import { logCronAgainstHobbyTarget } from "@/lib/cron-hobby-log"

/**
 * Cron Job API: IGDB 기대작 출시일 → Supabase events Insert (신작)
 *
 * GET /api/cron/update-new-releases
 *
 * IGDB PopScore "Most Wishlisted Upcoming"(기대작 페이지에 가장 가까운 순위) 우선,
 * 실패 시 미출시+hypes 순 등으로 후보를 고른 뒤 출시일이 확정된 상위 10개를
 * events 테이블에 event_type='New' 로 추가합니다.
 * title=한글 정발명 우선·없으면 영문, game_category=영문, description=`{title} 출시`,
 * external_url=NULL, header_image_url=스크린샷/아트/커버 URL 또는 NULL.
 * external_id(igdb-anticipated-{id})로 중복 삽입을 건너뜁니다.
 */
export const maxDuration = 60

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Missing Supabase credentials" },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const startedAt = Date.now()

  try {
    const { games: anticipatedGames, stats: igdbStats } = await fetchTopAnticipatedGames(10, 50)
    const resolvedCount = anticipatedGames.length

    if (resolvedCount === 0) {
      return NextResponse.json({
        success: true,
        resolved: 0,
        inserted: 0,
        skipped: 0,
        igdb: igdbStats,
        message:
          "No anticipated games with a future release date (see igdb.* pool counts; verify TWITCH_* env and IGDB data)",
      })
    }

    const formattedEvents = anticipatedGames.map((game) => {
      const releaseDate = new Date(game.resolved_release_date * 1000).toISOString()
      const title = game.display_title

      return {
        external_id: `igdb-anticipated-${game.id}`,
        title,
        description: `${title} 출시`,
        event_type: "New",
        start_date: releaseDate,
        end_date: null,
        game_category: game.english_title,
        header_image_url: game.header_image_url,
        external_url: null,
      }
    })

    /* ignoreDuplicates: true → external_id 충돌 시 기존 레코드 유지 (건너뜀) */
    const { data, error } = await supabase
      .from("events")
      .upsert(formattedEvents, {
        onConflict: "external_id",
        ignoreDuplicates: true,
      })
      .select("id")

    if (error) {
      console.error("[update-new-releases] Supabase upsert error:", error)
      return NextResponse.json(
        { error: "Upsert failed", details: error.message },
        { status: 500 }
      )
    }

    const insertedCount = data?.length ?? 0
    const skippedCount = formattedEvents.length - insertedCount

    return NextResponse.json({
      success: true,
      resolved: resolvedCount,
      inserted: insertedCount,
      skipped: skippedCount,
      igdb: igdbStats,
    })
  } catch (err) {
    console.error("[update-new-releases] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  } finally {
    logCronAgainstHobbyTarget("update-new-releases", startedAt)
  }
}
