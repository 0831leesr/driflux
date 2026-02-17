import { NextResponse } from "next/server"
import { searchChzzkLives } from "@/lib/chzzk"

/**
 * Test API: Search Chzzk Streams by Keyword
 * 
 * GET /api/cron/test-search?keyword=마인크래프트
 * 
 * This endpoint tests the Chzzk search API with a specific keyword
 * to verify that the search functionality works correctly.
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

  const { searchParams } = new URL(request.url)
  const keyword = searchParams.get("keyword") || "마인크래프트"

  try {
    const streams = await searchChzzkLives(keyword, 10)

    return NextResponse.json({
      success: true,
      keyword,
      streamsFound: streams.length,
      streams: streams.map(s => ({
        channelName: s.channelName,
        liveTitle: s.liveTitle,
        viewers: s.concurrentUserCount,
        category: s.category,
      })),
      note: "If this returns streams but update-streams doesn't save them, there's a DB issue",
    })
  } catch (error) {
    console.error("[Search Test] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to search",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
