import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { fetchTopAnticipatedGames } from "@/lib/igdb"
import { logCronAgainstHobbyTarget } from "@/lib/cron-hobby-log"

/**
 * Cron Job API: IGDB 기대작 출시일 → Supabase events Insert (신작)
 *
 * GET /api/cron/update-new-releases
 *
 * IGDB hypes 기준 상위 10개 미출시 기대작 중 출시일이 확정된 게임을
 * events 테이블에 event_type='New' 로 추가합니다.
 * external_id(igdb-anticipated-{id}) 기준으로 이미 추가된 게임은 건너뜁니다.
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
    const anticipatedGames = await fetchTopAnticipatedGames(10)
    const totalFetched = anticipatedGames.length

    if (totalFetched === 0) {
      return NextResponse.json({
        success: true,
        fetched: 0,
        inserted: 0,
        skipped: 0,
        message: "No anticipated games returned from IGDB",
      })
    }

    /* 출시일이 확정된 게임만 필터링 */
    const nowUnix = Math.floor(Date.now() / 1000)
    const gamesWithDate = anticipatedGames.filter(
      (g) => g.first_release_date != null && g.first_release_date > nowUnix
    )

    if (gamesWithDate.length === 0) {
      return NextResponse.json({
        success: true,
        fetched: totalFetched,
        inserted: 0,
        skipped: totalFetched,
        message: "All anticipated games lack a confirmed future release date",
      })
    }

    const formattedEvents = gamesWithDate.map((game) => {
      const releaseDate = new Date(game.first_release_date! * 1000).toISOString()

      const rawCoverUrl = game.cover?.url?.trim() ?? null
      const coverUrl = rawCoverUrl
        ? (rawCoverUrl.startsWith("//") ? `https:${rawCoverUrl}` : rawCoverUrl).replace(
            /t_thumb/g,
            "t_cover_big"
          )
        : null

      const slug = game.slug?.trim() ?? game.name.toLowerCase().replace(/\s+/g, "-")
      const externalUrl = `https://www.igdb.com/games/${slug}`

      return {
        external_id: `igdb-anticipated-${game.id}`,
        title: game.name,
        description: game.summary?.trim() ?? null,
        event_type: "New",
        start_date: releaseDate,
        end_date: null,
        game_category: game.name,
        header_image_url: coverUrl,
        external_url: externalUrl,
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
      fetched: totalFetched,
      withDate: gamesWithDate.length,
      inserted: insertedCount,
      skipped: skippedCount,
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
