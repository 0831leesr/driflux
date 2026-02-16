import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { getSteamGameDetails, processSteamData, delay } from "@/lib/steam"

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

    // Fetch games with steam_appid
    let query = supabase
      .from("games")
      .select("id, title, steam_appid")
      .not("steam_appid", "is", null)

    // Filter by specific app ID if provided
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
        message: "No games with steam_appid found",
        stats: {
          total: 0,
          updated: 0,
          failed: 0,
          skipped: 0,
        },
        duration: Date.now() - startTime,
      })
    }

    console.log(`[Steam Update] Found ${games.length} games to update`)

    // Update each game
    const results = {
      total: games.length,
      updated: 0,
      failed: 0,
      skipped: 0,
      details: [] as Array<{
        id: number
        title: string
        steam_appid: number
        status: "updated" | "failed" | "skipped"
        message?: string
      }>,
    }

    for (const game of games) {
      const steamAppId = game.steam_appid as number

      try {
        console.log(`[Steam Update] Processing: ${game.title} (App ID: ${steamAppId})`)

        // Fetch Steam data (cc=kr for Korean pricing, l=koreana for Korean language)
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
          continue
        }

        // Process and prepare update data
        const processedData = processSteamData(steamData)

        console.log(`[Steam Update] Updating game ${game.id} with data:`, {
          title: processedData.title,
          price_krw: processedData.price_krw,
          discount_rate: processedData.discount_rate,
          is_free: processedData.is_free,
          tags: processedData.tags,
        })

        // Update database using ADMIN CLIENT (bypasses RLS)
        const { data: updateData, error: updateError } = await adminSupabase
          .from("games")
          .update({
            title: processedData.title, // Update title in case it changed
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
          console.error(`[Steam Update] ✗ Database update failed for ${game.title}`)
          console.error(`[Steam Update] Error details:`, {
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            code: updateError.code,
          })
          results.failed++
          results.details.push({
            id: game.id,
            title: game.title,
            steam_appid: steamAppId,
            status: "failed",
            message: `Database update failed: ${updateError.message} (${updateError.code})`,
          })
        } else {
          console.log(`[Steam Update] ✓ Updated: ${game.title}`)
          console.log(`[Steam Update] Updated rows:`, updateData?.length || 0)
          
          // Process tags (genres) if available
          if (processedData.tags && processedData.tags.length > 0) {
            console.log(`[Steam Update] Processing ${processedData.tags.length} tags for ${game.title}`)
            
            try {
              // Step 1: Upsert tags into tags table
              const tagIds: number[] = []
              
              for (const tagName of processedData.tags) {
                // Generate slug from tag name
                const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                
                // Upsert tag (insert if not exists, get ID if exists)
                const { data: tagData, error: tagError } = await adminSupabase
                  .from("tags")
                  .upsert(
                    { name: tagName, slug: slug },
                    { onConflict: 'name', ignoreDuplicates: false }
                  )
                  .select('id')
                  .single()
                
                if (tagError) {
                  // If upsert fails, try to fetch existing tag
                  console.warn(`[Steam Update] Tag upsert warning for "${tagName}":`, tagError.message)
                  const { data: existingTag } = await adminSupabase
                    .from("tags")
                    .select('id')
                    .eq('name', tagName)
                    .single()
                  
                  if (existingTag) {
                    tagIds.push(existingTag.id)
                  }
                } else if (tagData) {
                  tagIds.push(tagData.id)
                }
              }
              
              console.log(`[Steam Update] Collected ${tagIds.length} tag IDs`)
              
              // Step 2: Delete existing game-tag relationships
              const { error: deleteError } = await adminSupabase
                .from("game_tags")
                .delete()
                .eq("game_id", game.id)
              
              if (deleteError) {
                console.warn(`[Steam Update] Failed to delete old game_tags for game ${game.id}:`, deleteError.message)
              }
              
              // Step 3: Insert new game-tag relationships
              if (tagIds.length > 0) {
                const gameTags = tagIds.map(tagId => ({
                  game_id: game.id,
                  tag_id: tagId,
                }))
                
                const { error: insertError } = await adminSupabase
                  .from("game_tags")
                  .insert(gameTags)
                
                if (insertError) {
                  console.error(`[Steam Update] ✗ Failed to insert game_tags for ${game.title}:`, insertError.message)
                } else {
                  console.log(`[Steam Update] ✓ Inserted ${tagIds.length} tags for ${game.title}`)
                }
              }
            } catch (tagProcessError) {
              console.error(`[Steam Update] ✗ Error processing tags for ${game.title}:`, tagProcessError)
            }
          }
          
          results.updated++
          results.details.push({
            id: game.id,
            title: game.title,
            steam_appid: steamAppId,
            status: "updated",
          })
        }

        // Rate limiting: wait before next request
        if (games.indexOf(game) < games.length - 1) {
          await delay(1500) // 1.5 seconds
        }

      } catch (error) {
        console.error(`[Steam Update] ✗ Error processing ${game.title}:`, error)
        results.failed++
        results.details.push({
          id: game.id,
          title: game.title,
          steam_appid: steamAppId,
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
