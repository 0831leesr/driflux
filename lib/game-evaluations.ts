import type { GameRow } from "@/lib/data"

/** Steam `review_score_desc` 영문 → 한글 (긍정/부정 요약) */
const STEAM_REVIEW_DESC_KO: Record<string, string> = {
  "overwhelmingly positive": "압도적으로 긍정적",
  "very positive": "매우 긍정적",
  "mostly positive": "대체로 긍정적",
  positive: "긍정적",
  mixed: "복합적",
  "mostly negative": "대체로 부정적",
  negative: "부정적",
  "very negative": "매우 부정적",
  "overwhelmingly negative": "압도적으로 부정적",
}

/**
 * 스팀 평가 요약 문구를 UI용 한글로 바꿉니다. 매핑 없으면 원문을 그대로 둡니다.
 */
export function localizeSteamReviewDesc(desc: string | null | undefined): string | null {
  const t = desc?.trim()
  if (!t) return null
  const key = t.toLowerCase()
  return STEAM_REVIEW_DESC_KO[key] ?? t
}

/** 스팀 평가 표시 가능 여부: Overwhelmingly Positive ~ Overwhelmingly Negative만. NULL, "No user reviews", "N user reviews" 제외 */
export function isValidSteamReview(game: { steam_review_desc?: string | null }): boolean {
  const desc = game.steam_review_desc?.trim()
  if (!desc) return false
  if (/^no user reviews$/i.test(desc)) return false
  if (/^\d+ user reviews?$/i.test(desc)) return false
  return true
}

export function gameHasEvaluationScores(game: GameRow): boolean {
  return (
    (isValidSteamReview(game) && game.steam_positive_ratio != null) || game.critic_score != null
  )
}

/** 평가·리뷰 섹션 전체를 보여줄지 (요약 점수 또는 스팀 앱 연결) */
export function gameShowsEvaluationsSection(game: GameRow): boolean {
  return gameHasEvaluationScores(game) || game.steam_appid != null
}
