import { NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { getPopularCategories } from "@/lib/chzzk"
import { logCronAgainstHobbyTarget } from "@/lib/cron-hobby-log"

/**
 * Discover Top Game Categories from Chzzk & Upsert to games table.
 *
 * Uses categories/live API directly — no per-game stream search needed.
 * Saves Korean title, English category ID, current viewer count, and popularity rank.
 *
 * Query Parameters:
 * - size: Number of top categories to process (default: 50)
 *
 * Example:
 * GET /api/cron/discover-top-games?size=100
 */
export async function GET(request: Request) {
  // Auth: CRON_SECRET below — not browser session getUser().
  if (process.env.NODE_ENV !== "development") {
    const authHeader = request.headers.get("authorization")
    const expectedAuth = process.env.CRON_SECRET
      ? `Bearer ${process.env.CRON_SECRET}`
      : null

    if (!expectedAuth || authHeader !== expectedAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  console.time("[Top Games Discovery] Total duration")
  const startTime = Date.now()
  const { searchParams } = new URL(request.url)
  const sizeParam = searchParams.get("size")
  const size = sizeParam ? parseInt(sizeParam, 10) : 50

  console.log(`[Top Games Discovery] Starting — top ${size} categories`)

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Missing Supabase credentials" }, { status: 500 })
    }

    const adminSupabase = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // categories/live API 1회 호출로 인기 게임 카테고리 목록 취득
    const categories = await getPopularCategories(size)

    if (categories.length === 0) {
      console.error("[Top Games Discovery] Failed to fetch popular categories")
      return NextResponse.json(
        { error: "Failed to fetch popular categories from Chzzk" },
        { status: 500 }
      )
    }

    console.log(`[Top Games Discovery] Fetched ${categories.length} game categories`)
    console.log("[Top Games Discovery] Top 5:", categories.slice(0, 5).map((c) => c.title))

    let saved = 0
    let failed = 0

    for (let i = 0; i < categories.length; i++) {
      const category = categories[i]
      const popularityRank = i + 1
      const slug = category.title
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]+/g, "-")
        .replace(/^-|-$/g, "")

      try {
        const { error } = await adminSupabase.from("games").upsert(
          {
            title: category.title,
            korean_title: category.title,
            english_title: category.originalId.replace(/_/g, " "),
            slug,
            total_viewers: category.viewerCount,
            popularity_rank: popularityRank,
            last_popularity_update: new Date().toISOString(),
          },
          { onConflict: "slug", ignoreDuplicates: false }
        )

        if (error) {
          console.error(`[Top Games Discovery] ✗ "${category.title}":`, error.message)
          failed++
        } else {
          console.log(
            `[Top Games Discovery] ✓ #${popularityRank} "${category.title}" (${category.viewerCount.toLocaleString()} viewers)`
          )
          saved++
        }
      } catch (err) {
        console.error(`[Top Games Discovery] Exception for "${category.title}":`, err)
        failed++
      }
    }

    const duration = Date.now() - startTime
    console.timeEnd("[Top Games Discovery] Total duration")
    console.log(`[Top Games Discovery] Done — saved: ${saved}, failed: ${failed}, duration: ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: `Processed ${categories.length} categories: ${saved} saved, ${failed} failed`,
      saved,
      failed,
      duration,
    })
  } catch (error) {
    console.timeEnd("[Top Games Discovery] Total duration")
    console.error("[Top Games Discovery] Fatal error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    logCronAgainstHobbyTarget("discover-top-games", startTime)
  }
}
