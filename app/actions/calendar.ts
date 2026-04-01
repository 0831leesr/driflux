"use server"

import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase/server"

export interface CalendarFollowResult {
  followed?: boolean
  error?: string
}

/**
 * calendar_follows 테이블에서 팔로우 상태를 토글합니다.
 * 비로그인 사용자는 localStorage로만 관리되므로 { error: "Unauthorized" }를 반환합니다.
 */
export async function toggleFollowEvent(eventId: number): Promise<CalendarFollowResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  const { data: existing } = await supabase
    .from("calendar_follows")
    .select("event_id")
    .eq("user_id", user.id)
    .eq("event_id", eventId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from("calendar_follows")
      .delete()
      .eq("user_id", user.id)
      .eq("event_id", eventId)
    if (error) return { error: error.message }
    revalidatePath("/")
    return { followed: false }
  } else {
    const { error } = await supabase
      .from("calendar_follows")
      .insert({ user_id: user.id, event_id: eventId })
    if (error) return { error: error.message }
    revalidatePath("/")
    return { followed: true }
  }
}
