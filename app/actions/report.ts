"use server"

import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/server"

const DAILY_REPORT_LIMIT = 5
const COOKIE_NAME = "daily_report_count"

export type ReportFields = {
  image: boolean
  title: boolean
  price: boolean
  link: boolean
}

/** 자정(KST 기준 UTC+9)까지 남은 초를 계산 */
function secondsUntilMidnight(): number {
  const now = new Date()
  // UTC+9 기준 자정
  const midnight = new Date(now)
  midnight.setUTCHours(15, 0, 0, 0) // UTC 15:00 = KST 00:00
  if (midnight <= now) {
    midnight.setUTCDate(midnight.getUTCDate() + 1)
  }
  return Math.max(Math.floor((midnight.getTime() - now.getTime()) / 1000), 1)
}

export async function submitErrorReport(
  gameId: string,
  fields: ReportFields,
): Promise<{ success: true }> {
  if (!gameId?.trim()) {
    throw new Error("유효하지 않은 게임 ID입니다.")
  }

  const hasAnyChecked = Object.values(fields).some(Boolean)
  if (!hasAnyChecked) {
    throw new Error("하나 이상의 오류 항목을 선택해주세요.")
  }

  // ── 어뷰징 방지: 일일 신고 횟수 제한 ──────────────────────
  const cookieStore = await cookies()
  const rawCount = cookieStore.get(COOKIE_NAME)?.value
  const currentCount = rawCount ? parseInt(rawCount, 10) : 0

  if (currentCount >= DAILY_REPORT_LIMIT) {
    throw new Error("하루 최대 신고 횟수를 초과했습니다. 내일 다시 시도해주세요.")
  }

  // ── Supabase RPC 호출 ────────────────────────────────────
  const supabase = createAdminClient()

  const { error } = await supabase.rpc("increment_game_reports", {
    p_game_id: gameId,
    p_image: fields.image,
    p_title: fields.title,
    p_price: fields.price,
    p_link: fields.link,
  })

  if (error) {
    console.error("[submitErrorReport] RPC error:", error)
    throw new Error("신고 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
  }

  // ── 쿠키 카운트 증가 (자정까지 유효) ─────────────────────
  const maxAge = secondsUntilMidnight()
  cookieStore.set(COOKIE_NAME, String(currentCount + 1), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge,
  })

  return { success: true }
}
