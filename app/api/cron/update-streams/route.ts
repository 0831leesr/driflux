import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { searchChzzkLives, delay, getPopularCategories } from "@/lib/chzzk"

/**
 * Cron Job API: Discover and Update Chzzk Live Streams
 * 
 * GET /api/cron/update-streams
 * 
 * This endpoint searches for live streams on Chzzk by game title and updates the database.
 * It discovers NEW streams and updates existing ones.
 * Should be called periodically (e.g., every 5-10 minutes via Vercel Cron).
 * 
 * Optional Query Parameters:
 * - limit: Number of games to process (default: all)
 * - gameId: Process specific game only
 * - popular: If "true", only process popular categories from Chzzk (default: false)
 * - popularSize: Number of popular categories to fetch (default: 10)
 * - deleteOffline: If "true", delete offline streams instead of marking is_live=false (default: false)
 * 
 * Example:
 * GET /api/cron/update-streams
 * GET /api/cron/update-streams?limit=5
 * GET /api/cron/update-streams?gameId=42
 * GET /api/cron/update-streams?popular=true&popularSize=10
 * GET /api/cron/update-streams?popular=true&deleteOffline=true
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
  const gameIdParam = searchParams.get("gameId")
  const popularParam = searchParams.get("popular")
  const popularSizeParam = searchParams.get("popularSize")
  const deleteOfflineParam = searchParams.get("deleteOffline")
  
  const usePopularMode = popularParam === "true"
  const popularSize = popularSizeParam ? parseInt(popularSizeParam, 10) : 10
  const deleteOffline = deleteOfflineParam === "true"

  console.log("[Stream Discovery] Starting game-based stream discovery job...")
  if (usePopularMode) {
    console.log(`[Stream Discovery] Mode: Popular Categories (size: ${popularSize})`)
  }
  console.log(`[Stream Discovery] Delete offline streams: ${deleteOffline}`)

  try {
    // Create admin client with Service Role Key (bypasses RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[Stream Discovery] Missing Supabase credentials")
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

    console.log("[Stream Discovery] ✓ Admin client initialized")

    // Step 1: Determine which games to process
    let games: Array<{ id: number; title: string; korean_title: string | null }> = []

    if (usePopularMode) {
      // Mode A: Use popular categories from Chzzk
      console.log("[Stream Discovery] Fetching popular categories from Chzzk...")
      const popularCategories = await getPopularCategories(popularSize)

      if (popularCategories.length === 0) {
        return NextResponse.json({
          success: false,
          message: "Failed to fetch popular categories from Chzzk",
          stats: {
            gamesProcessed: 0,
            streamsFound: 0,
          },
          duration: Date.now() - startTime,
        })
      }

      console.log(`[Stream Discovery] Found ${popularCategories.length} popular categories`)
      console.log(`[Stream Discovery] Categories:`, popularCategories)

      // Find matching games in our database or create search keywords
      const gameMatches: typeof games = []

      for (const category of popularCategories) {
        // Try to find game by korean_title or title
        const { data: matchedGames } = await supabase
          .from("games")
          .select("id, title, korean_title")
          .or(`korean_title.ilike.%${category}%,title.ilike.%${category}%`)
          .limit(1)

        if (matchedGames && matchedGames.length > 0) {
          gameMatches.push(matchedGames[0])
          console.log(`[Stream Discovery] ✓ Matched category "${category}" to game: ${matchedGames[0].title}`)
        } else {
          // Create a virtual game entry for search (will be added to DB later)
          console.log(`[Stream Discovery] ⚠ No game found for category "${category}", will search directly`)
          gameMatches.push({
            id: -1, // Virtual ID (negative to distinguish)
            title: category,
            korean_title: category,
          })
        }
      }

      games = gameMatches
    } else {
      // Mode B: Use games from database (original logic)
      let gamesQuery = supabase
        .from("games")
        .select("id, title, korean_title")
        .order("id")

      // Filter by specific game if provided
      if (gameIdParam) {
        const gameId = parseInt(gameIdParam, 10)
        if (!isNaN(gameId)) {
          gamesQuery = gamesQuery.eq("id", gameId)
        }
      }

      // Limit games if specified
      if (limitParam) {
        const limit = parseInt(limitParam, 10)
        if (!isNaN(limit) && limit > 0) {
          gamesQuery = gamesQuery.limit(limit)
        }
      }

      const { data: dbGames, error: gamesError } = await gamesQuery

      if (gamesError) {
        console.error("[Stream Discovery] Failed to fetch games:", gamesError)
        return NextResponse.json(
          { error: "Failed to fetch games", details: gamesError.message },
          { status: 500 }
        )
      }

      games = dbGames || []
    }

    // Validation
    if (!games || games.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No games found in database",
        stats: {
          gamesProcessed: 0,
          streamsFound: 0,
          streamsCreated: 0,
          streamsUpdated: 0,
          streamsFailed: 0,
        },
        duration: Date.now() - startTime,
      })
    }

    console.log(`[Stream Discovery] Found ${games.length} games to search`)

    // Step 2: Track all active channel IDs found in this run
    const activeChannelIds = new Set<string>()

    // Step 3: Process each game
    const results = {
      gamesProcessed: 0,
      gamesWithStreams: 0,
      streamsFound: 0,
      streamsCreated: 0,
      streamsUpdated: 0,
      streamsFailed: 0,
      gameDetails: [] as Array<{
        gameId: number
        gameTitle: string
        searchKeyword: string
        streamsFound: number
        status: "success" | "failed"
        message?: string
      }>,
    }

    for (const game of games) {
      results.gamesProcessed++
      
      // Use korean_title if available, otherwise use English title
      const searchKeyword = game.korean_title || game.title
      
      console.log(`\n[Stream Discovery] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`[Stream Discovery] Processing game ${game.id}: ${game.title}`)
      console.log(`[Stream Discovery] Search keyword: "${searchKeyword}"`)

      try {
        // Search for live streams on Chzzk
        const streams = await searchChzzkLives(searchKeyword, 20)

        if (streams.length === 0) {
          console.log(`[Stream Discovery] No streams found for "${searchKeyword}"`)
          results.gameDetails.push({
            gameId: game.id,
            gameTitle: game.title,
            searchKeyword,
            streamsFound: 0,
            status: "success",
            message: "No streams found",
          })
          
          // Rate limiting between games
          await delay(1500)
          continue
        }

        console.log(`[Stream Discovery] Found ${streams.length} streams for "${searchKeyword}"`)
        results.streamsFound += streams.length
        results.gamesWithStreams++

        // Step 4: Upsert each stream
        for (const stream of streams) {
          activeChannelIds.add(stream.channelId)

          try {
            // Check if stream already exists
            const { data: existingStream } = await adminSupabase
              .from("streams")
              .select("id, chzzk_channel_id")
              .eq("chzzk_channel_id", stream.channelId)
              .single()

            // DEBUG: Log the stream data before saving
            console.log(`[Stream Discovery] Stream data to save:`, {
              title: stream.liveTitle,
              channelName: stream.channelName,
              channelId: stream.channelId,
              viewerCount: stream.concurrentUserCount,
              category: stream.category,
            })

            const streamData = {
              title: stream.liveTitle,
              streamer_name: stream.channelName,
              chzzk_channel_id: stream.channelId,
              stream_url: `https://chzzk.naver.com/live/${stream.channelId}`,
              thumbnail_url: stream.liveImageUrl,
              is_live: true,
              viewer_count: stream.concurrentUserCount,
              stream_category: stream.category || null,
              game_id: game.id > 0 ? game.id : null, // Only set game_id if it's a real game from DB
              last_chzzk_update: new Date().toISOString(),
            }

            console.log(`[Stream Discovery] streamData object:`, streamData)

            if (existingStream) {
              // Update existing stream - Try with explicit SQL
              const { data: updateData, error: updateError } = await adminSupabase
                .from("streams")
                .update({
                  title: stream.liveTitle,
                  streamer_name: stream.channelName,
                  stream_url: `https://chzzk.naver.com/live/${stream.channelId}`,
                  thumbnail_url: stream.liveImageUrl,
                  is_live: true,
                  viewer_count: Number(stream.concurrentUserCount), // Force convert to number
                  stream_category: stream.category || null,
                  game_id: game.id > 0 ? game.id : null,
                  last_chzzk_update: new Date().toISOString(),
                })
                .eq("id", existingStream.id)
                .select('id, viewer_count, stream_category, title')

              if (updateError) {
                console.error(`[Stream Discovery] ✗ Failed to update stream ${stream.channelId}:`, updateError.message)
                console.error(`[Stream Discovery] Error details:`, JSON.stringify(updateError, null, 2))
                results.streamsFailed++
              } else {
                console.log(`[Stream Discovery] ✓ Updated: ${stream.channelName} - ${stream.liveTitle}`)
                console.log(`[Stream Discovery] Input viewer_count: ${stream.concurrentUserCount} (type: ${typeof stream.concurrentUserCount})`)
                console.log(`[Stream Discovery] DB returned:`, JSON.stringify(updateData, null, 2))
                results.streamsUpdated++
              }
            } else {
              // Insert new stream
              const { error: insertError } = await adminSupabase
                .from("streams")
                .insert(streamData)

              if (insertError) {
                console.error(`[Stream Discovery] ✗ Failed to insert stream ${stream.channelId}:`, insertError.message)
                results.streamsFailed++
              } else {
                console.log(`[Stream Discovery] ✓ Created: ${stream.channelName} - ${stream.liveTitle}`)
                results.streamsCreated++
              }
            }

          } catch (streamError) {
            console.error(`[Stream Discovery] ✗ Error processing stream ${stream.channelId}:`, streamError)
            results.streamsFailed++
          }
        }

        results.gameDetails.push({
          gameId: game.id,
          gameTitle: game.title,
          searchKeyword,
          streamsFound: streams.length,
          status: "success",
        })

        // Rate limiting between games
        await delay(1500)

      } catch (gameError) {
        console.error(`[Stream Discovery] ✗ Error processing game ${game.id}:`, gameError)
        results.gameDetails.push({
          gameId: game.id,
          gameTitle: game.title,
          searchKeyword,
          streamsFound: 0,
          status: "failed",
          message: gameError instanceof Error ? gameError.message : "Unknown error",
        })
      }
    }

    // Step 5: Handle offline streams
    // Grace period: only mark offline if last_chzzk_update is older than 30 min (or null).
    // Prevents "Time Window Gap" - streams added by discover-top-games that we didn't
    // search in this run should remain visible until next cron cycle.
    const GRACE_PERIOD_MS = 30 * 60 * 1000 // 30 minutes
    const graceCutoff = new Date(Date.now() - GRACE_PERIOD_MS).toISOString()

    console.log(`\n[Stream Discovery] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`[Stream Discovery] Cleaning up offline streams...`)
    console.log(`[Stream Discovery] Active channels in this run: ${activeChannelIds.size}`)
    console.log(`[Stream Discovery] Grace period: only mark offline if last_chzzk_update < ${graceCutoff}`)

    const activeChannelArray = Array.from(activeChannelIds)
    
    if (activeChannelArray.length === 0) {
      console.log(`[Stream Discovery] Skipping offline cleanup - no active channels in this run`)
    } else {
      // Find streams that were live but not found in this run AND are outside grace period
      const { data: previouslyLiveStreams } = await adminSupabase
        .from("streams")
        .select("id, chzzk_channel_id, streamer_name, last_chzzk_update")
        .eq("is_live", true)
        .not("chzzk_channel_id", "in", `(${activeChannelArray.map(id => `'${id}'`).join(',')})`)
        .or(`last_chzzk_update.lt.${graceCutoff},last_chzzk_update.is.null`)

      if (previouslyLiveStreams && previouslyLiveStreams.length > 0) {
        const idsToClean = previouslyLiveStreams.map((s) => s.id)
        if (deleteOffline) {
          // Option 1: Delete offline streams (only those outside grace period)
          console.log(`[Stream Discovery] Deleting ${idsToClean.length} offline streams`)
          
          const { error: deleteError } = await adminSupabase
            .from("streams")
            .delete()
            .in("id", idsToClean)

          if (deleteError) {
            console.error(`[Stream Discovery] ✗ Failed to delete offline streams:`, deleteError.message)
          } else {
            console.log(`[Stream Discovery] ✓ Deleted ${idsToClean.length} offline streams`)
          }
        } else {
          // Option 2: Mark as offline (only those outside grace period)
          console.log(`[Stream Discovery] Marking ${idsToClean.length} streams as offline`)
          
          const { error: offlineError } = await adminSupabase
            .from("streams")
            .update({
              is_live: false,
              viewer_count: 0,
              last_chzzk_update: new Date().toISOString(),
            })
            .in("id", idsToClean)

          if (offlineError) {
            console.error(`[Stream Discovery] ✗ Failed to update offline streams:`, offlineError.message)
          } else {
            console.log(`[Stream Discovery] ✓ Marked ${idsToClean.length} streams as offline`)
          }
        }
      } else {
        console.log(`[Stream Discovery] No streams to mark as offline (all within 30-min grace period)`)
      }
    }

    const duration = Date.now() - startTime

    console.log(`\n[Stream Discovery] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`[Stream Discovery] Job completed in ${duration}ms`)
    console.log(`[Stream Discovery] Games processed: ${results.gamesProcessed}`)
    console.log(`[Stream Discovery] Games with streams: ${results.gamesWithStreams}`)
    console.log(`[Stream Discovery] Total streams found: ${results.streamsFound}`)
    console.log(`[Stream Discovery] Streams created: ${results.streamsCreated}`)
    console.log(`[Stream Discovery] Streams updated: ${results.streamsUpdated}`)
    console.log(`[Stream Discovery] Streams failed: ${results.streamsFailed}`)
    console.log(`[Stream Discovery] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

    return NextResponse.json({
      success: true,
      message: `Processed ${results.gamesProcessed} games, found ${results.streamsFound} streams (${results.streamsCreated} new, ${results.streamsUpdated} updated)`,
      stats: results,
      duration,
    })

  } catch (error) {
    console.error("[Stream Discovery] Fatal error:", error)
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
