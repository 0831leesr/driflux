import { NextRequest, NextResponse } from "next/server"
import { getChzzkLiveStatusBatch } from "@/lib/chzzk"
import { createServerClient } from "@/lib/supabase/server"
import { requireSessionUser } from "@/lib/auth-session"

const MAX_CHANNELS = 50

/**
 * POST /api/streamers/status
 * Fetches live status for multiple Chzzk channels.
 * Used by sidebar "MY FOLLOWED STREAMERS" and follow tab.
 */
export async function POST(request: NextRequest) {
  const session = await requireSessionUser()
  if ("response" in session) return session.response

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

    const supabase = await createServerClient()
    const { data: followRows } = await supabase
      .from("user_follows")
      .select("target_id")
      .eq("user_id", session.user.id)
      .eq("target_type", "streamer")
      .in("target_id", channelIds)

    const allowed = new Set((followRows ?? []).map((r) => r.target_id as string))
    const filteredIds = channelIds.filter((id) => allowed.has(id))
    if (filteredIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const data = await getChzzkLiveStatusBatch(filteredIds)
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[API streamers/status] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch streamer status" },
      { status: 500 }
    )
  }
}
