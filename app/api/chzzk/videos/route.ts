import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getChzzkVideosByCategory } from "@/lib/chzzk"

/**
 * GET /api/chzzk/videos?categoryId=OMORI&size=20&offset=0
 * Fetches VOD/video list for a Chzzk game category.
 * Uses cached data from game_videos when available (cron 1일 1회 갱신).
 * Falls back to Chzzk API when cache is empty.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get("categoryId")?.trim()
  const size = Math.min(50, Math.max(1, parseInt(searchParams.get("size") ?? "20", 10) || 20))
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0)

  if (!categoryId) {
    return NextResponse.json(
      { error: "categoryId is required" },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient()
    const { data: cached, error } = await supabase
      .from("game_videos")
      .select("video_id, video_title, thumbnail_url, read_count, channel_name, channel_id")
      .eq("category_id", categoryId)
      .order("read_count", { ascending: false })
      .range(offset, offset + size - 1)

    if (!error && cached && cached.length > 0) {
      const videos = cached.map((row) => ({
        videoId: row.video_id,
        videoTitle: row.video_title,
        thumbnailImageUrl: row.thumbnail_url ?? "",
        readCount: row.read_count ?? 0,
        channel: {
          channelName: row.channel_name ?? "Unknown",
          channelId: row.channel_id ?? "",
        },
      }))
      return NextResponse.json({ videos, source: "cache" })
    }

    const videos = await getChzzkVideosByCategory(categoryId, size, offset)
    return NextResponse.json({ videos, source: "api" })
  } catch (error) {
    console.error("[API chzzk/videos] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    )
  }
}
