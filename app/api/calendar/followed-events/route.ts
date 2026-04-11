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

    // 뷰는 보통 events.id 를 id 로 노출함 (event_id 별칭 없음). events.game_category ↔ UI subtitle(game_title).
    const { data, error } = await supabase
      .from("upcoming_followed_events")
      .select("id, title, start_date, end_date, event_type, game_category")
      .eq("user_id", user.id)
      .order("start_date", { ascending: true })

    if (error) {
      console.error("[followed-events] Supabase error:", error.message)
      return NextResponse.json([])
    }

    const rows = (data ?? []) as Array<{
      id: number
      title: string
      start_date: string
      end_date: string | null
      event_type: string | null
      game_category: string | null
    }>

    return NextResponse.json(
      rows.map((row) => ({
        event_id: row.id,
        title: row.title,
        start_date: row.start_date,
        end_date: row.end_date,
        event_type: row.event_type,
        game_title: row.game_category,
      })),
    )
  } catch (err) {
    console.error("[followed-events] Unexpected error:", err)
    return NextResponse.json([])
  }
}
