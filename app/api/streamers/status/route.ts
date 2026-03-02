import { NextRequest, NextResponse } from "next/server"
import { getChzzkLiveStatusBatch } from "@/lib/chzzk"

const MAX_CHANNELS = 50

/**
 * POST /api/streamers/status
 * Fetches live status for multiple Chzzk channels.
 * Used by sidebar "MY FOLLOWED STREAMERS" and follow tab.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const channelIds = Array.isArray(body.channelIds)
      ? (body.channelIds as string[])
          .filter((id): id is string => typeof id === "string" && id.trim() !== "")
          .map((id) => id.trim())
          .slice(0, MAX_CHANNELS)
      : []

    if (channelIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const data = await getChzzkLiveStatusBatch(channelIds)
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[API streamers/status] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch streamer status" },
      { status: 500 }
    )
  }
}
