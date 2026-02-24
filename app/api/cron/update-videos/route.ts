import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { getChzzkVideosByCategory } from "@/lib/chzzk"
import { delay } from "@/lib/utils"

/** Vercel serverless timeout: 300초 (cron 제한) */
export const maxDuration = 300

/**
 * Cron Job API: Update Chzzk VOD/Video Cache
 *
 * GET /api/cron/update-videos
 *
 * Fetches VOD list from Chzzk for games with english_title and caches in game_videos table.
 * Should be called daily (e.g., via daily-metadata.yml).
 *
 * Optional Query Parameters:
 * - limit: Number of games to process (default: 30)
 *
 * Example:
 * GET /api/cron/update-videos
 * GET /api/cron/update-videos?limit=20
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
  const limitParam = searchParams.get("limit")
  const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10) || 30)) : 30

  console.log("[Videos Update] Starting VOD cache update job...")

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[Videos Update] Missing Supabase credentials")
      return NextResponse.json(
        { error: "Server configuration error: Missing Supabase credentials" },
        { status: 500 }
      )
    }

    const adminSupabase = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const supabase = await createClient()

    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("id, english_title")
      .not("english_title", "is", null)
      .limit(limit)

    if (gamesError || !games?.length) {
      console.log("[Videos Update] No games with english_title found")
      return NextResponse.json({
        success: true,
        message: "No games to process",
        stats: { gamesProcessed: 0, videosCached: 0 },
        duration: Date.now() - startTime,
      })
    }

    const toProcess = games.filter((g) => g.english_title?.trim()) as {
      id: number
      english_title: string
    }[]
    let totalVideos = 0

    for (let i = 0; i < toProcess.length; i++) {
      const game = toProcess[i]
      const categoryId = game.english_title.trim()

      try {
        const videos = await getChzzkVideosByCategory(categoryId, 20, 0)

        if (videos.length === 0) {
          await adminSupabase.from("game_videos").delete().eq("category_id", categoryId)
          continue
        }

        await adminSupabase.from("game_videos").delete().eq("category_id", categoryId)

        const rows = videos.map((v) => ({
          category_id: categoryId,
          game_id: game.id,
          video_id: v.videoId,
          video_title: v.videoTitle,
          thumbnail_url: v.thumbnailImageUrl || null,
          read_count: v.readCount || 0,
          channel_name: v.channel?.channelName || null,
          channel_id: v.channel?.channelId || null,
        }))

        const { error: insertError } = await adminSupabase.from("game_videos").insert(rows)

        if (insertError) {
          console.error(`[Videos Update] Insert error for ${categoryId}:`, insertError)
        } else {
          totalVideos += rows.length
          console.log(`[Videos Update] Cached ${rows.length} videos for ${categoryId}`)
        }
      } catch (err) {
        console.error(`[Videos Update] Error fetching ${categoryId}:`, err)
      }

      if (i < toProcess.length - 1) {
        await delay(1000)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cached ${totalVideos} videos for ${toProcess.length} games`,
      stats: { gamesProcessed: toProcess.length, videosCached: totalVideos },
      duration: Date.now() - startTime,
    })
  } catch (error) {
    console.error("[Videos Update] Fatal error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        duration: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}
