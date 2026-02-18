import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { getPopularCategories, CHZZK_SEARCH_LIVES_URL } from "@/lib/chzzk"
import { delay } from "@/lib/utils"

/**
 * Discover Top Game Streams from Chzzk (Chzzk-only, no Steam/IGDB)
 *
 * Fetches popular GAME streams from Chzzk and saves to DB.
 * Steam/IGDB metadata is delegated to update-steam (daily-metadata).
 *
 * Query Parameters:
 * - size: Number of streams to fetch (default: 50)
 *
 * Example:
 * GET /api/cron/discover-top-games?size=100
 */
export async function GET(request: Request) {
  console.time("[Top Games Discovery] Total duration")

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
  const sizeParam = searchParams.get("size")
  const size = sizeParam ? parseInt(sizeParam, 10) : 50

  console.log("[Top Games Discovery] Starting top game streams discovery...")
  console.log(`[Top Games Discovery] Fetching top ${size} streams`)

  try {
    // Create admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Missing Supabase credentials" },
        { status: 500 }
      )
    }

    const adminSupabase = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const supabase = await createClient()

    // Fetch popular categories from Chzzk
    console.log(`[Top Games Discovery] Fetching real-time popular categories from Chzzk...`)
    
    const allCategories = await getPopularCategories(50) // Get top 50 categories
    
    if (allCategories.length === 0) {
      console.error(`[Top Games Discovery] Failed to fetch popular categories`)
      return NextResponse.json(
        { error: "Failed to fetch popular categories from Chzzk" },
        { status: 500 }
      )
    }

    console.log(`[Top Games Discovery] Found ${allCategories.length} total categories`)
    console.log(`[Top Games Discovery] Filtering for GAME categories only...`)

    // Filter for GAME categories by testing each one
    const gameCategories: string[] = []
    
    for (const category of allCategories) {
      try {
        // Quick search to check categoryType
        const testUrl = `${CHZZK_SEARCH_LIVES_URL}?keyword=${encodeURIComponent(category)}&size=1&offset=0`
        
        const testResponse = await fetch(testUrl, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "Referer": "https://chzzk.naver.com/",
          },
          cache: "no-store",
        })

        if (testResponse.ok) {
          const testData = await testResponse.json()
          if (testData?.code === 200 && testData.content?.data?.[0]) {
            const firstItem = testData.content.data[0]
            const liveData = firstItem.live || firstItem
            const categoryType = liveData.categoryType || liveData.category_type
            
            if (categoryType === "GAME") {
              gameCategories.push(category)
              console.log(`[Top Games Discovery] ✓ GAME: ${category}`)
            } else {
              console.log(`[Top Games Discovery] ✗ ${categoryType || 'UNKNOWN'}: ${category}`)
            }
          }
        }

        await delay(100)

        if (gameCategories.length >= 10) {
          console.log(`[Top Games Discovery] Found 10 game categories, stopping`)
          break
        }
      } catch (err) {
        console.error(`[Top Games Discovery] Error checking category ${category}:`, err)
      }
    }

    console.log(`[Top Games Discovery] Filtered to ${gameCategories.length} GAME categories`)
    console.log(`[Top Games Discovery] Game categories:`, gameCategories)

    if (gameCategories.length === 0) {
      console.error(`[Top Games Discovery] No game categories found`)
      return NextResponse.json(
        { error: "No game categories found" },
        { status: 500 }
      )
    }

    const popularGameKeywords = gameCategories

    const allStreams: any[] = []

    // Search each game
    for (const keyword of popularGameKeywords) {
      try {
        const url = `${CHZZK_SEARCH_LIVES_URL}?keyword=${encodeURIComponent(keyword)}&size=20&offset=0`

        console.log(`[Top Games Discovery] Searching: ${keyword}`)

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Referer": "https://chzzk.naver.com/",
          },
          cache: "no-store",
        })

        if (response.ok) {
          const data = await response.json()
          const rawCount = data?.content?.data?.length ?? 0
          console.log(`[Top Games Discovery] Chzzk API returned ${rawCount} streams for "${keyword}".`)
          if (data?.code === 200 && data.content?.data) {
            allStreams.push(...data.content.data)
          }
        }

        await delay(100)
      } catch (err) {
        console.error(`[Top Games Discovery] Error searching ${keyword}:`, err)
      }
    }

    console.log(`[Top Games Discovery] Total streams collected: ${allStreams.length}`)
    const rawStreams = allStreams

    // Remove duplicates by channelId
    const uniqueStreams = Array.from(
      new Map(rawStreams.map((item: any) => {
        const channelId = item.live?.channelId || item.channel?.channelId
        return [channelId, item]
      })).values()
    )

    console.log(`[Top Games Discovery] Unique streams after deduplication: ${uniqueStreams.length}`)

    // Filter for GAME category only and process
    const gameStreams = uniqueStreams
      .filter((item: any) => {
        const liveData = item.live || item
        const categoryType = liveData.categoryType || liveData.category_type
        return categoryType === "GAME"
      })
      .map((item: any) => {
        const liveData = item.live || item
        const channelData = item.channel || {}

        let thumbnailUrl = liveData.liveImageUrl || channelData.channelImageUrl || ""
        if (thumbnailUrl && thumbnailUrl.includes("{type}")) {
          thumbnailUrl = thumbnailUrl.replace(/{type}/g, "720")
        }

        const viewerCount = Number(liveData.concurrentUserCount || 0)

        // Extract BOTH English and Korean game names
        const englishCategory = liveData.liveCategory || null // English (e.g., "Rimworld")
        const koreanCategory = liveData.liveCategoryValue || null // Korean (e.g., "림월드")
        
        // Use Korean as primary display name, fallback to English
        const displayCategory = koreanCategory || englishCategory

        return {
          channelId: liveData.channelId || channelData.channelId,
          channelName: channelData.channelName || liveData.channelName,
          liveTitle: liveData.liveTitle || "No Title",
          thumbnailUrl,
          viewerCount,
          category: displayCategory, // For display and grouping
          categoryEnglish: englishCategory, // For Steam search
          categoryKorean: koreanCategory, // For display
          openDate: liveData.openDate || new Date().toISOString(),
        }
      })
      .filter((stream: any) => stream.channelId)
      .sort((a: any, b: any) => b.viewerCount - a.viewerCount)
      .slice(0, size) // Limit to requested size

    console.log(`[Top Games Discovery] Filtered to ${gameStreams.length} GAME streams (limited to top ${size})`)
    console.log(`[Top Games Discovery] Top 5 streams by viewers:`)
    gameStreams.slice(0, 5).forEach((s: any, i: number) => {
      console.log(`  ${i + 1}. ${s.channelName} - ${s.liveTitle} (${s.viewerCount} viewers)`)
    })

    // Track active channel IDs
    const activeChannelIds = new Set<string>()

    // Stats
    const stats = {
      totalFetched: rawStreams.length,
      gameStreams: gameStreams.length,
      created: 0,
      updated: 0,
      failed: 0,
    }

    // STEP A: Calculate game statistics and save to games table
    console.log(`\n[Top Games Discovery] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`[Top Games Discovery] STEP A: Calculating game statistics`)
    console.log(`[Top Games Discovery] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

    // Group streams by category and calculate total viewers
    const categoryStats = new Map<string, { streamCount: number; totalViewers: number; streams: any[] }>()

    gameStreams.forEach(stream => {
      if (!stream.category) return
      
      const stats = categoryStats.get(stream.category) || { streamCount: 0, totalViewers: 0, streams: [] }
      stats.streamCount++
      stats.totalViewers += stream.viewerCount
      stats.streams.push(stream)
      categoryStats.set(stream.category, stats)
    })

    // Sort by total viewers (most popular first)
    const sortedCategories = Array.from(categoryStats.entries())
      .sort((a, b) => b[1].totalViewers - a[1].totalViewers)

    console.log(`[Top Games Discovery] Found ${sortedCategories.length} unique game categories`)
    console.log(`[Top Games Discovery] Top 5 by viewers:`)
    sortedCategories.slice(0, 5).forEach(([cat, stats], idx) => {
      console.log(`  ${idx + 1}. ${cat}: ${stats.streamCount} streams, ${stats.totalViewers.toLocaleString()} viewers`)
    })

    // STEP A2: Save games with statistics
    console.log(`\n[Top Games Discovery] STEP A2: Saving games to database`)
    const categoryToGameId = new Map<string, number>()
    const categoryToEnglishName = new Map<string, string | null>()

    // First, extract English names from streams
    gameStreams.forEach(stream => {
      if (stream.category && stream.categoryEnglish) {
        categoryToEnglishName.set(stream.category, stream.categoryEnglish)
      }
    })

    for (let i = 0; i < sortedCategories.length; i++) {
      const [category, stats] = sortedCategories[i]
      const popularityRank = i + 1
      const englishName = categoryToEnglishName.get(category) || null

      try {
        const slug = category.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '')
        
        console.log(`[Top Games Discovery] Saving game #${popularityRank}: "${category}"`)
        if (englishName) {
          console.log(`[Top Games Discovery]   English name: "${englishName}"`)
        }

        // Upsert game: Chzzk data only. Preserve existing cover/header/description (do not include).
        const { data: gameData, error: gameError } = await adminSupabase
          .from("games")
          .upsert(
            {
              title: category,
              korean_title: category,
              english_title: englishName,
              slug: slug,
              total_viewers: stats.totalViewers,
              popularity_rank: popularityRank,
              last_popularity_update: new Date().toISOString(),
            },
            {
              onConflict: 'slug',
              ignoreDuplicates: false,
            }
          )
          .select('id, title, english_title, total_viewers, popularity_rank')

        if (gameError) {
          console.error(`[Top Games Discovery] ✗ Game save error for "${category}":`, {
            code: gameError.code,
            message: gameError.message,
            details: gameError.details,
            hint: gameError.hint,
          })
          
          // Try to fetch existing game
          const { data: existingGame } = await adminSupabase
            .from("games")
            .select('id, title')
            .eq('slug', slug)
            .single()

          if (existingGame) {
            console.log(`[Top Games Discovery] ⚠ Using existing game: ${existingGame.title} (ID: ${existingGame.id})`)
            categoryToGameId.set(category, existingGame.id)
          }
        } else if (gameData && gameData.length > 0) {
          const game = gameData[0]
          console.log(`[Top Games Discovery] ✓ Game saved: "${category}" (ID: ${game.id}, Rank: ${game.popularity_rank}, Viewers: ${game.total_viewers})`)
          categoryToGameId.set(category, game.id)
        }
      } catch (err) {
        console.error(`[Top Games Discovery] Exception saving game "${category}":`, err)
      }
    }

    console.log(`[Top Games Discovery] Saved ${categoryToGameId.size} games (Chzzk-only; Steam/IGDB via daily-metadata)`)

    // STEP B: Save streams with mapped game_id
    console.log(`\n[Top Games Discovery] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`[Top Games Discovery] STEP B: Saving streams to database`)
    console.log(`[Top Games Discovery] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

    // Upsert each stream
    for (const stream of gameStreams) {
      activeChannelIds.add(stream.channelId)

      try {
        // Get mapped game_id
        const gameId = stream.category ? categoryToGameId.get(stream.category) || null : null

        const streamData = {
          title: stream.liveTitle,
          streamer_name: stream.channelName,
          chzzk_channel_id: stream.channelId,
          stream_url: `https://chzzk.naver.com/live/${stream.channelId}`,
          thumbnail_url: stream.thumbnailUrl,
          is_live: true,
          viewer_count: Number(stream.viewerCount),
          stream_category: stream.category || null,
          game_id: gameId,
          last_chzzk_update: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        const { error: upsertError } = await adminSupabase
          .from("streams")
          .upsert(streamData, {
            onConflict: 'chzzk_channel_id',
            ignoreDuplicates: false,
          })

        if (upsertError) {
          console.error(`[Top Games Discovery] ✗ Stream write error: ${upsertError.message}`)
          stats.failed++
        } else {
          stats.created++
        }

        await delay(100) // Small delay between inserts
      } catch (err) {
        console.error(`[Top Games Discovery] ✗✗✗ EXCEPTION ✗✗✗`)
        console.error(`[Top Games Discovery] Exception:`, err)
        console.error(`[Top Games Discovery] Stack:`, err instanceof Error ? err.stack : 'N/A')
        stats.failed++
      }
    }

    // Delete offline streams
    // Grace period: only delete if last_chzzk_update is older than 30 min (or null).
    // Prevents "Time Window Gap" - streams from update-streams that we didn't fetch
    // in this run should remain visible until next cron cycle.
    const GRACE_PERIOD_MS = 30 * 60 * 1000 // 30 minutes
    const graceCutoff = new Date(Date.now() - GRACE_PERIOD_MS).toISOString()

    console.log(`\n[Top Games Discovery] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`[Top Games Discovery] STEP C: Cleaning up offline streams`)
    console.log(`[Top Games Discovery] Grace period: only delete if last_chzzk_update < ${graceCutoff}`)
    console.log(`[Top Games Discovery] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    
    const activeArray = Array.from(activeChannelIds)
    console.log(`[Top Games Discovery] Active channels in this run: ${activeArray.length}`)
    console.log(`[Top Games Discovery] Sample active channels:`, activeArray.slice(0, 5))

    if (activeArray.length === 0) {
      console.warn(`[Top Games Discovery] ⚠ No active channels found, skipping cleanup`)
    } else {
      // Find streams that are marked as live but not in our active list AND outside grace period
      const { data: offlineStreams, error: selectError } = await adminSupabase
        .from("streams")
        .select("id, chzzk_channel_id, streamer_name")
        .eq("is_live", true)
        .not("chzzk_channel_id", "in", `(${activeArray.map(id => `'${id}'`).join(',')})`)
        .or(`last_chzzk_update.lt.${graceCutoff},last_chzzk_update.is.null`)

      if (selectError) {
        console.error(`[Top Games Discovery] ✗ Failed to query offline streams:`, selectError.message)
      } else if (offlineStreams && offlineStreams.length > 0) {
        console.log(`[Top Games Discovery] Found ${offlineStreams.length} streams to delete (outside 30-min grace period)`)
        console.log(`[Top Games Discovery] Offline streams:`, offlineStreams.map(s => s.streamer_name))

        const { error: deleteError } = await adminSupabase
          .from("streams")
          .delete()
          .in("id", offlineStreams.map(s => s.id))

        if (deleteError) {
          console.error(`[Top Games Discovery] ✗ Delete failed:`, deleteError.message)
        } else {
          console.log(`[Top Games Discovery] ✓ Deleted ${offlineStreams.length} offline streams`)
        }
      } else {
        console.log(`[Top Games Discovery] ✓ No offline streams to delete (all within 30-min grace period)`)
      }
    }

    const duration = Date.now() - startTime
    console.timeEnd("[Top Games Discovery] Total duration")
    console.log(`[Top Games Discovery] Completed in ${duration}ms`, stats)

    return NextResponse.json({
      success: true,
      message: `Fetched ${stats.gameStreams} game streams (${stats.created} new, ${stats.updated} updated)`,
      stats,
      duration,
    })

  } catch (error) {
    console.timeEnd("[Top Games Discovery] Total duration")
    console.error("[Top Games Discovery] Fatal error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
