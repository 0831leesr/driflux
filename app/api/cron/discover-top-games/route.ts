import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { delay, getPopularCategories } from "@/lib/chzzk"
import { findSteamAppIdWithConfidence, getSteamGameDetails, processSteamData } from "@/lib/steam"

/**
 * Discover Top Game Streams from Chzzk
 * 
 * This API fetches the most popular GAME streams directly from Chzzk,
 * without relying on our games database.
 * 
 * Query Parameters:
 * - size: Number of streams to fetch (default: 50)
 * 
 * Example:
 * GET /api/cron/discover-top-games?size=100
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
  const sizeParam = searchParams.get("size")
  const size = sizeParam ? parseInt(sizeParam, 10) : 50

  console.log("[Top Games Discovery] Starting top game streams discovery...")
  console.log(`[Top Games Discovery] Fetching top ${size} streams`)

  try {
    // Create admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log(`[Top Games Discovery] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`[Top Games Discovery] Supabase Configuration:`)
    console.log(`[Top Games Discovery]   URL: ${supabaseUrl}`)
    console.log(`[Top Games Discovery]   Service Key: ${supabaseServiceKey?.substring(0, 20)}...`)
    console.log(`[Top Games Discovery] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

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

    // Test database connection
    console.log(`[Top Games Discovery] Testing database connection...`)
    const { data: testData, error: testError } = await adminSupabase
      .from("streams")
      .select("count")
      .limit(1)
    
    if (testError) {
      console.error(`[Top Games Discovery] ✗ Database connection test failed:`, testError)
    } else {
      console.log(`[Top Games Discovery] ✓ Database connection successful`)
    }

    // Check current stream count
    const { count: currentCount } = await adminSupabase
      .from("streams")
      .select("*", { count: "exact", head: true })
    
    console.log(`[Top Games Discovery] Current streams in database: ${currentCount}`)

    // Fetch REAL-TIME popular categories from Chzzk
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
        const testUrl = `https://api.chzzk.naver.com/service/v1/search/lives?keyword=${encodeURIComponent(category)}&size=1&offset=0`
        
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

        // Rate limiting to avoid API throttling
        await delay(500)

        // Stop after finding 20 game categories
        if (gameCategories.length >= 20) {
          console.log(`[Top Games Discovery] Found 20 game categories, stopping search`)
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
        const url = `https://api.chzzk.naver.com/service/v1/search/lives?keyword=${encodeURIComponent(keyword)}&size=20&offset=0`

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
          if (data?.code === 200 && data.content?.data) {
            console.log(`[Top Games Discovery] Found ${data.content.data.length} streams for ${keyword}`)
            allStreams.push(...data.content.data)
          }
        }

        // Rate limiting
        await delay(1000)
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

        // Upsert game with statistics and English name
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

    console.log(`[Top Games Discovery] Successfully saved ${categoryToGameId.size} games to database`)

    // STEP A3: Fetch Steam information for each game
    console.log(`\n[Top Games Discovery] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`[Top Games Discovery] STEP A3: Fetching Steam information`)
    console.log(`[Top Games Discovery] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

    let steamUpdateCount = 0
    let nonSteamCount = 0
    let steamNotFoundCount = 0

    for (const [category, gameId] of categoryToGameId.entries()) {
      try {
        const englishName = categoryToEnglishName.get(category) || null
        
        console.log(`[Top Games Discovery] Processing: "${category}"`)
        if (englishName) {
          console.log(`[Top Games Discovery]   English name: "${englishName}"`)
        }

        // Search Steam: Try English first, then Korean
        let matchResult = null
        
        if (englishName) {
          console.log(`[Top Games Discovery] 🔍 Searching Steam with ENGLISH name: "${englishName}"`)
          matchResult = await findSteamAppIdWithConfidence(englishName, 80)
          
          if (matchResult) {
            console.log(`[Top Games Discovery] ✓ Found match using English name!`)
          } else {
            console.log(`[Top Games Discovery] ⚠ English search failed, trying Korean name...`)
          }
        }
        
        // Fallback to Korean if English search failed
        if (!matchResult) {
          console.log(`[Top Games Discovery] 🔍 Searching Steam with KOREAN name: "${category}"`)
          matchResult = await findSteamAppIdWithConfidence(category, 80)
        }

        if (!matchResult) {
          console.log(`[Top Games Discovery] ⊗ "${category}" not found on Steam (or low confidence match)`)
          console.log(`[Top Games Discovery] Marking as non-Steam game...`)
          
          // Update game as non-Steam
          const { error: platformError } = await adminSupabase
            .from("games")
            .update({
              platform: 'non-steam',
              steam_appid: null,
            })
            .eq('id', gameId)

          if (platformError) {
            console.error(`[Top Games Discovery] ✗ Failed to update platform for "${category}"`)
          } else {
            console.log(`[Top Games Discovery] ✓ Marked "${category}" as non-Steam game`)
          }

          nonSteamCount++
          await delay(1000) // Rate limit
          continue
        }

        const appId = matchResult.appId
        console.log(`[Top Games Discovery] ✓ Found Steam match: "${matchResult.matchedName}" (${matchResult.confidence}% confidence)`)
        console.log(`[Top Games Discovery] Using Steam AppID: ${appId}`)

        // Fetch detailed game info from Steam
        const steamData = await getSteamGameDetails(appId)

        if (!steamData) {
          console.log(`[Top Games Discovery] ⚠ Failed to fetch Steam details for appid ${appId}`)
          steamNotFoundCount++
          await delay(1500) // Rate limit
          continue
        }

        // Process Steam data
        const processedData = processSteamData(steamData)

        // Limit tags to top 5
        const topTags = processedData.tags.slice(0, 5)

        console.log(`[Top Games Discovery] Processing Steam data for "${category}":`)
        console.log(`[Top Games Discovery]   - AppID: ${processedData.steam_appid}`)
        console.log(`[Top Games Discovery]   - Title: ${processedData.title}`)
        console.log(`[Top Games Discovery]   - Price: ${processedData.price_krw ? `₩${processedData.price_krw}` : 'Free'}`)
        console.log(`[Top Games Discovery]   - Tags: ${topTags.join(', ')}`)

        // Update game with Steam information
        const { error: updateError } = await adminSupabase
          .from("games")
          .update({
            platform: 'steam',
            steam_appid: processedData.steam_appid,
            cover_image_url: processedData.cover_image_url,
            header_image_url: processedData.header_image_url,
            background_image_url: processedData.background_image_url,
            price_krw: processedData.price_krw,
            original_price_krw: processedData.original_price_krw,
            discount_rate: processedData.discount_rate,
            is_free: processedData.is_free,
            top_tags: topTags,
          })
          .eq('id', gameId)

        if (updateError) {
          console.error(`[Top Games Discovery] ✗ Failed to update game ${gameId} with Steam info:`, {
            code: updateError.code,
            message: updateError.message,
          })
        } else {
          console.log(`[Top Games Discovery] ✓ Updated game "${category}" with Steam info`)
          steamUpdateCount++
        }

        // Rate limiting: 1.5 seconds between Steam API calls
        await delay(1500)

      } catch (err) {
        console.error(`[Top Games Discovery] Exception fetching Steam info for "${category}":`, err)
        nonSteamCount++
      }
    }

    console.log(`[Top Games Discovery] Steam update summary:`)
    console.log(`[Top Games Discovery]   - Successfully updated (Steam): ${steamUpdateCount}`)
    console.log(`[Top Games Discovery]   - Marked as non-Steam: ${nonSteamCount}`)

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
        }

        console.log(`[Top Games Discovery] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        console.log(`[Top Games Discovery] Saving stream #${gameStreams.indexOf(stream) + 1}/${gameStreams.length}:`)
        console.log(`[Top Games Discovery]   Channel: ${stream.channelName}`)
        console.log(`[Top Games Discovery]   Title: ${stream.liveTitle}`)
        console.log(`[Top Games Discovery]   Viewers: ${stream.viewerCount} (type: ${typeof stream.viewerCount})`)
        console.log(`[Top Games Discovery]   Category: ${stream.category}`)
        console.log(`[Top Games Discovery]   Game ID: ${gameId}`)

        // Upsert stream (insert or update based on chzzk_channel_id)
        const { data: upsertResult, error: upsertError } = await adminSupabase
          .from("streams")
          .upsert(streamData, {
            onConflict: 'chzzk_channel_id',
            ignoreDuplicates: false,
          })
          .select('id, title, viewer_count, stream_category, game_id')

        if (upsertError) {
          console.error(`[Top Games Discovery] ✗✗✗ SUPABASE WRITE ERROR ✗✗✗`)
          console.error(`[Top Games Discovery] Error Code: ${upsertError.code}`)
          console.error(`[Top Games Discovery] Error Message: ${upsertError.message}`)
          console.error(`[Top Games Discovery] Error Details: ${upsertError.details}`)
          console.error(`[Top Games Discovery] Error Hint: ${upsertError.hint}`)
          console.error(`[Top Games Discovery] Full Error Object:`, JSON.stringify(upsertError, null, 2))
          console.error(`[Top Games Discovery] Data that failed:`, JSON.stringify(streamData, null, 2))
          stats.failed++
        } else {
          console.log(`[Top Games Discovery] ✓✓✓ WRITE SUCCESSFUL ✓✓✓`)
          console.log(`[Top Games Discovery] Returned from DB:`, JSON.stringify(upsertResult, null, 2))
          
          if (upsertResult && upsertResult.length > 0) {
            // Check if viewer_count was actually saved
            const savedStream = upsertResult[0]
            if (savedStream.viewer_count !== stream.viewerCount) {
              console.warn(`[Top Games Discovery] ⚠⚠⚠ WARNING: viewer_count mismatch!`)
              console.warn(`[Top Games Discovery] Expected: ${stream.viewerCount}`)
              console.warn(`[Top Games Discovery] Got: ${savedStream.viewer_count}`)
            } else {
              console.log(`[Top Games Discovery] ✓ viewer_count verified: ${savedStream.viewer_count}`)
            }
          }
          
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
    console.log(`\n[Top Games Discovery] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`[Top Games Discovery] STEP C: Cleaning up offline streams`)
    console.log(`[Top Games Discovery] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    
    const activeArray = Array.from(activeChannelIds)
    console.log(`[Top Games Discovery] Active channels in this run: ${activeArray.length}`)
    console.log(`[Top Games Discovery] Sample active channels:`, activeArray.slice(0, 5))

    if (activeArray.length === 0) {
      console.warn(`[Top Games Discovery] ⚠ No active channels found, skipping cleanup`)
    } else {
      // Find streams that are marked as live but not in our active list
      const { data: offlineStreams, error: selectError } = await adminSupabase
        .from("streams")
        .select("id, chzzk_channel_id, streamer_name")
        .eq("is_live", true)
        .not("chzzk_channel_id", "in", `(${activeArray.join(',')})`)

      if (selectError) {
        console.error(`[Top Games Discovery] ✗ Failed to query offline streams:`, selectError.message)
      } else if (offlineStreams && offlineStreams.length > 0) {
        console.log(`[Top Games Discovery] Found ${offlineStreams.length} streams to mark as offline`)
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
        console.log(`[Top Games Discovery] ✓ No offline streams to delete`)
      }
    }

    const duration = Date.now() - startTime

    console.log(`[Top Games Discovery] Completed in ${duration}ms`)
    console.log(`[Top Games Discovery] Stats:`, stats)

    return NextResponse.json({
      success: true,
      message: `Fetched ${stats.gameStreams} game streams (${stats.created} new, ${stats.updated} updated)`,
      stats,
      duration,
    })

  } catch (error) {
    console.error("[Top Games Discovery] Fatal error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
