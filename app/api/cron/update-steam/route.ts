import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { getSteamGameDetails, processSteamData, delay } from "@/lib/steam"
import { searchIGDBGame } from "@/lib/igdb"
import { TAG_TRANSLATIONS } from "@/lib/constants"

/**
 * Cron Job API: Update Steam Game Data
 * 
 * GET /api/cron/update-steam
 * 
 * This endpoint fetches latest data from Steam API and updates the database.
 * Should be called periodically (e.g., daily via Vercel Cron or manual trigger).
 * 
 * Optional Query Parameters:
 * - limit: Number of games to update (default: all)
 * - appid: Update specific app only
 * 
 * Example:
 * GET /api/cron/update-steam
 * GET /api/cron/update-steam?limit=10
 * GET /api/cron/update-steam?appid=1245620
 */
export async function GET(request: Request) {
  // Security: Verify cron secret (skip in development)
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
  const appIdParam = searchParams.get("appid")

  console.log("[Steam Update] Starting update job...")

  try {
    // Create admin client with Service Role Key (bypasses RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[Steam Update] Missing Supabase credentials")
      return NextResponse.json(
        { error: "Server configuration error: Missing Supabase credentials" },
        { status: 500 }
      )
    }

    // Admin client for write operations (bypasses RLS)
    const adminSupabase = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Regular client for read operations
    const supabase = await createClient()

    console.log("[Steam Update] ✓ Admin client initialized with Service Role Key")

    // Fetch ALL games (Steam + non-Steam). header_image_url NULL 우선 처리.
    let query = supabase
      .from("games")
      .select("id, title, korean_title, english_title, steam_appid, header_image_url")
      .order("header_image_url", { ascending: true, nullsFirst: true })

    // Filter by specific app ID if provided (Steam games only)
    if (appIdParam) {
      const appId = parseInt(appIdParam, 10)
      if (isNaN(appId)) {
        return NextResponse.json(
          { error: "Invalid appid parameter" },
          { status: 400 }
        )
      }
      query = query.eq("steam_appid", appId)
    }

    // Limit results if specified
    if (limitParam) {
      const limit = parseInt(limitParam, 10)
      if (!isNaN(limit) && limit > 0) {
        query = query.limit(limit)
      }
    }

    const { data: games, error: fetchError } = await query

    if (fetchError) {
      console.error("[Steam Update] Database fetch error:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch games from database", details: fetchError.message },
        { status: 500 }
      )
    }

    if (!games || games.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No games found",
        stats: {
          total: 0,
          updated: 0,
          failed: 0,
          skipped: 0,
        },
        duration: Date.now() - startTime,
      })
    }

    console.log(`[Steam Update] Found ${games.length} games to update (Steam + non-Steam)`)

    const results = {
      total: games.length,
      updated: 0,
      failed: 0,
      skipped: 0,
      details: [] as Array<{
        id: number
        title: string
        steam_appid: number | null
        status: "updated" | "failed" | "skipped"
        message?: string
      }>,
    }

    /* ── IGDB 우선, Steam 후순위 병합 로직 ── */
    for (const game of games) {
      console.log(`[Steam Update] Processing: ${game.title} (SteamID: ${game.steam_appid ?? "null"})`)

      try {
        // Step A: 데이터 수집 (Fetch)
        let steamData: Awaited<ReturnType<typeof processSteamData>> | null = null
        if (game.steam_appid) {
          const raw = await getSteamGameDetails(game.steam_appid, "kr")
          if (raw) steamData = processSteamData(raw)
          await delay(1500)
        }

        let igdbData: Awaited<ReturnType<typeof searchIGDBGame>> = null
        const koreanTitle = (game as { korean_title?: string | null }).korean_title?.trim() || null
        const englishTitle = (game as { english_title?: string | null }).english_title?.trim() || null
        const fallbackTitle = game.title?.trim() || ""
        igdbData = await searchIGDBGame(
          koreanTitle || (englishTitle ? null : fallbackTitle),
          englishTitle || fallbackTitle
        )
        await delay(600)

        if (!steamData && !igdbData) {
          console.log(`[Steam Update] Skipped (no data): ${game.title}`)
          results.skipped++
          results.details.push({ id: game.id, title: game.title, steam_appid: game.steam_appid ?? null, status: "skipped", message: "No Steam/IGDB data" })
          continue
        }

        // Step B: 데이터 병합 (Merge) - IGDB 우선
        const ig = igdbData
        const st = steamData
        const updatePayload: Record<string, string | number | boolean | null | string[]> = {
          cover_image_url: ig?.image_url ?? st?.cover_image_url ?? null,
          header_image_url: ig?.image_url ?? st?.header_image_url ?? null,
          background_image_url: ig?.backdrop_url ?? st?.background_image_url ?? null,
          short_description: ig?.summary ?? st?.short_description ?? null,
          developer: ig?.developer ?? null,
          publisher: ig?.publisher ?? null,
          steam_appid: st ? st.steam_appid : game.steam_appid,
          price_krw: st ? st.price_krw : null,
          original_price_krw: st ? st.original_price_krw : null,
          discount_rate: st ? st.discount_rate : null,
          is_free: st ? st.is_free : false,
          currency: st ? st.currency : null,
        }
        if (st) {
          updatePayload.title = st.title
          updatePayload.last_steam_update = new Date().toISOString()
        }

        // Step C: 태그 (IGDB genres+themes 우선, 없으면 Steam tags) + 한글 변환
        const rawTags = (ig?.tags?.length ? ig.tags : st?.tags ?? []) as string[]
        const tags = rawTags.map((t) => TAG_TRANSLATIONS[t] ?? t)
        updatePayload.top_tags = tags.slice(0, 5)

        const { error: updateError } = await adminSupabase
          .from("games")
          .update(updatePayload)
          .eq("id", game.id)

        if (updateError) {
          console.error(`[Steam Update] ✗ DB update failed:`, updateError.message)
          results.failed++
          results.details.push({
            id: game.id,
            title: game.title,
            steam_appid: game.steam_appid ?? null,
            status: "failed",
            message: updateError.message,
          })
        } else {
          if (tags.length > 0) {
            try {
              const tagIds: number[] = []
              for (const tagName of tags) {
                const slug = tagName
                  .toLowerCase()
                  .replace(/[^a-z0-9가-힣]+/g, "-")
                  .replace(/^-|-$/g, "")
                const { data: tagData, error: tagError } = await adminSupabase
                  .from("tags")
                  .upsert({ name: tagName, slug }, { onConflict: "name", ignoreDuplicates: false })
                  .select("id")
                  .single()
                if (tagError) {
                  const { data: existingTag } = await adminSupabase.from("tags").select("id").eq("name", tagName).single()
                  if (existingTag) tagIds.push(existingTag.id)
                } else if (tagData) tagIds.push(tagData.id)
              }
              await adminSupabase.from("game_tags").delete().eq("game_id", game.id)
              if (tagIds.length > 0) {
                await adminSupabase.from("game_tags").insert(tagIds.map((tagId) => ({ game_id: game.id, tag_id: tagId })))
              }
            } catch (tagErr) {
              console.error(`[Steam Update] Tag sync error:`, tagErr)
            }
          }
          console.log(`[Steam Update] ✓ Updated: ${game.title}`)
          results.updated++
          results.details.push({ id: game.id, title: game.title, steam_appid: game.steam_appid ?? null, status: "updated" })
        }
      } catch (error) {
        console.error(`[Steam Update] ✗ Error processing ${game.title}:`, error)
        results.failed++
        results.details.push({
          id: game.id,
          title: game.title,
          steam_appid: game.steam_appid ?? null,
          status: "failed",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    const duration = Date.now() - startTime

    console.log(`[Steam Update] Job completed in ${duration}ms`)
    console.log(`[Steam Update] Stats: ${results.updated} updated, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      message: `Updated ${results.updated} of ${results.total} games`,
      stats: {
        total: results.total,
        updated: results.updated,
        failed: results.failed,
        skipped: results.skipped,
      },
      details: results.details,
      duration,
    })

  } catch (error) {
    console.error("[Steam Update] Fatal error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * Health check endpoint
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
