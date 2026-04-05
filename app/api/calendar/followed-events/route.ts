import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { requireSessionUser } from "@/lib/auth-session"

/**
 * GET /api/calendar/followed-events
 * 로그인한 유저의 팔로우된 upcoming 일정을 upcoming_followed_events 뷰에서 가져옵니다.
 * 비로그인 시 401.
 */
export async function GET() {
  const session = await requireSessionUser()
  if ("response" in session) return session.response

  try {
    const supabase = await createServerClient()
    const { user } = session

    const { data, error } = await supabase
      .from("upcoming_followed_events")
      .select("event_id, title, start_date, end_date, event_type, game_title")
      .eq("user_id", user.id)
      .order("start_date", { ascending: true })

    if (error) {
      console.error("[followed-events] Supabase error:", error.message)
      return NextResponse.json([])
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error("[followed-events] Unexpected error:", err)
    return NextResponse.json([])
  }
}
