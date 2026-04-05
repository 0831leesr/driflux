/**
 * 게임 카드 좌상단 특징 태그 — 신작 D+N / 트렌딩 / 급상승 / 드롭스
 *
 * 우선순위 순으로 최대 3개까지 표시됩니다.
 * GameCardData.featureTags 에 배열로 담아 GameCard 에 전달하세요.
 */
export type FeatureTagPreset = "트렌딩" | "급상승" | "드롭스"

export type FeatureTagItem =
  | { kind: "new"; dPlus: number }
  | { kind: "preset"; tag: FeatureTagPreset }

/**
 * 각 플래그를 받아 우선순위 순서로 FeatureTagItem 배열을 반환합니다.
 * 해당 없는 경우 undefined 를 반환합니다.
 */
export function buildFeatureTags(flags: {
  /** 출시 후 경과 일수(D+). newReleaseDPlusForBadge 등으로 계산해 전달하세요. */
  newReleaseDPlus?: number | null
  isTrending?: boolean
  isRising?: boolean
  hasDrops?: boolean
}): FeatureTagItem[] | undefined {
  const tags: FeatureTagItem[] = []
  if (flags.newReleaseDPlus != null && flags.newReleaseDPlus >= 0) {
    tags.push({ kind: "new", dPlus: Math.floor(flags.newReleaseDPlus) })
  }
  if (flags.isTrending) tags.push({ kind: "preset", tag: "트렌딩" })
  if (flags.isRising) tags.push({ kind: "preset", tag: "급상승" })
  if (flags.hasDrops) tags.push({ kind: "preset", tag: "드롭스" })
  const limited = tags.slice(0, 3)
  return limited.length > 0 ? limited : undefined
}
