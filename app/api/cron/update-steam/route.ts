import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { getSteamGameDetails, processSteamData, delay } from "@/lib/steam"
import { searchIGDBGame } from "@/lib/igdb"

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
      .select("id, title, english_title, steam_appid, header_image_url")
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

    /* ── Dual Logic: Steam API (Case A) / IGDB (Case B) ── */
    for (const game of games) {
      console.log(`[Steam Update] Processing game: ${game.title} (SteamID: ${game.steam_appid ?? "null"})`)

      try {
        // Case A: 스팀 게임인 경우
        if (game.steam_appid) {
          const steamAppId = game.steam_appid
          const steamData = await getSteamGameDetails(steamAppId, "kr")

          if (!steamData) {
            console.warn(`[Steam Update] ✗ Failed to fetch data for ${game.title}`)
            results.failed++
            results.details.push({
              id: game.id,
              title: game.title,
              steam_appid: steamAppId,
              status: "failed",
              message: "Steam API returned no data",
            })
            await delay(1500)
          } else {
            const processedData = processSteamData(steamData)
            console.log(`[Steam Update] Updating game ${game.id} with Steam data:`, {
              title: processedData.title,
              price_krw: processedData.price_krw,
              discount_rate: processedData.discount_rate,
            })

            const { error: updateError } = await adminSupabase
              .from("games")
              .update({
                title: processedData.title,
                cover_image_url: processedData.cover_image_url,
                header_image_url: processedData.header_image_url,
                background_image_url: processedData.background_image_url,
                price_krw: processedData.price_krw,
                original_price_krw: processedData.original_price_krw,
                discount_rate: processedData.discount_rate,
                is_free: processedData.is_free,
                currency: processedData.currency,
                last_steam_update: new Date().toISOString(),
              })
              .eq("id", game.id)
              .select()

            if (updateError) {
              console.error(`[Steam Update] ✗ Database update failed for ${game.title}:`, updateError.message)
              results.failed++
              results.details.push({
                id: game.id,
                title: game.title,
                steam_appid: steamAppId,
                status: "failed",
                message: `Database update failed: ${updateError.message}`,
              })
            } else {
              if (processedData.tags && processedData.tags.length > 0) {
                try {
                  const tagIds: number[] = []
                  for (const tagName of processedData.tags) {
                    const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                    const { data: tagData, error: tagError } = await adminSupabase
                      .from("tags")
                      .upsert({ name: tagName, slug }, { onConflict: 'name', ignoreDuplicates: false })
                      .select('id')
                      .single()
                    if (tagError) {
                      const { data: existingTag } = await adminSupabase.from("tags").select('id').eq('name', tagName).single()
                      if (existingTag) tagIds.push(existingTag.id)
                    } else if (tagData) tagIds.push(tagData.id)
                  }
                  await adminSupabase.from("game_tags").delete().eq("game_id", game.id)
                  if (tagIds.length > 0) {
                    await adminSupabase.from("game_tags").insert(tagIds.map(tagId => ({ game_id: game.id, tag_id: tagId })))
                  }
                } catch (tagProcessError) {
                  console.error(`[Steam Update] ✗ Error processing tags for ${game.title}:`, tagProcessError)
                }
              }
              console.log(`[Steam Update] ✓ Updated (Steam): ${game.title}`)
              results.updated++
              results.details.push({ id: game.id, title: game.title, steam_appid: steamAppId, status: "updated" })
            }
            await delay(1500)
          }
        }
        // Case B: 비스팀 게임인 경우 (IGDB 사용)
        else {
          let igdbData = null

          // 1. Try English Title first (IGDB에 영어 검색이 더 정확함)
          const englishTitle = (game as { english_title?: string | null }).english_title?.trim()
          if (englishTitle) {
            console.log(`[IGDB] Trying English title: ${englishTitle}`)
            igdbData = await searchIGDBGame(englishTitle)
            await delay(350)
          }

          // 2. Fallback to Korean Title if English failed or didn't exist
          if (!igdbData) {
            console.log(`[IGDB] English failed/missing. Trying Korean title: ${game.title}`)
            igdbData = await searchIGDBGame(game.title)
          }

          try {
            if (igdbData) {
              console.log(`[IGDB] Found match: ${igdbData.title}, Image: ${igdbData.image_url.substring(0, 50)}...`)
              const updatePayload: Record<string, string | null | string[]> = {
                header_image_url: igdbData.image_url,
                cover_image_url: igdbData.image_url,
                short_description: igdbData.summary ?? null,
                developer: igdbData.developer ?? null,
                publisher: igdbData.publisher ?? null,
                top_tags: (igdbData.tags ?? []).slice(0, 5),
              }
              if (igdbData.backdrop_url) {
                updatePayload.background_image_url = igdbData.backdrop_url
              }
              const { error: igdbUpdateError } = await adminSupabase
                .from("games")
                .update(updatePayload)
                .eq("id", game.id)

              if (igdbUpdateError) {
                console.error(`[IGDB] Update failed for ${game.title}:`, igdbUpdateError.message)
                results.failed++
                results.details.push({
                  id: game.id,
                  title: game.title,
                  steam_appid: null,
                  status: "failed",
                  message: `IGDB update failed: ${igdbUpdateError.message}`,
                })
              } else {
                // 태그(장르/테마) 저장: tags + game_tags
                if (igdbData.tags && igdbData.tags.length > 0) {
                  try {
                    const tagIds: number[] = []
                    for (const tagName of igdbData.tags) {
                      const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
                      const { data: tagData, error: tagError } = await adminSupabase
                        .from("tags")
                        .upsert({ name: tagName, slug }, { onConflict: "name", ignoreDuplicates: false })
                        .select("id")
                        .single()
                      if (tagError) {
                        const { data: existingTag } = await adminSupabase
                          .from("tags")
                          .select("id")
                          .eq("name", tagName)
                          .single()
                        if (existingTag) tagIds.push(existingTag.id)
                      } else if (tagData) {
                        tagIds.push(tagData.id)
                      }
                    }
                    await adminSupabase.from("game_tags").delete().eq("game_id", game.id)
                    if (tagIds.length > 0) {
                      await adminSupabase
                        .from("game_tags")
                        .insert(tagIds.map((tagId) => ({ game_id: game.id, tag_id: tagId })))
                    }
                  } catch (tagProcessError) {
                    console.error(`[IGDB] Tag sync error for ${game.title}:`, tagProcessError)
                  }
                }
                console.log(`[IGDB] ✓ Updated: ${game.title}`)
                results.updated++
                results.details.push({ id: game.id, title: game.title, steam_appid: null, status: "updated" })
              }
            } else {
              console.log(`[IGDB] No data found for: ${game.title}`)
              results.skipped++
              results.details.push({ id: game.id, title: game.title, steam_appid: null, status: "skipped", message: "IGDB: No match" })
            }
          } catch (igdbError) {
            console.error(`[IGDB] Error processing ${game.title}:`, igdbError)
            results.failed++
            results.details.push({
              id: game.id,
              title: game.title,
              steam_appid: null,
              status: "failed",
              message: `IGDB error: ${igdbError instanceof Error ? igdbError.message : "Unknown"}`,
            })
          }
          await delay(500)
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
