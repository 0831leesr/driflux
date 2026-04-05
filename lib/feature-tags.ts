/**
 * 게임 카드 좌상단 특징 태그 — 신작 / 트렌딩 / 급상승 / 드롭스
 *
 * 우선순위 순으로 최대 3개까지 표시됩니다.
 * GameCardData.featureTags 에 배열로 담아 GameCard 에 전달하세요.
 */
export type FeatureTag = "신작" | "트렌딩" | "급상승" | "드롭스"

/**
 * 각 플래그를 받아 우선순위 순서로 FeatureTag 배열을 반환합니다.
 * 해당 없는 경우 undefined 를 반환합니다.
 */
export function buildFeatureTags(flags: {
  isNew?: boolean
  isTrending?: boolean
  isRising?: boolean
  hasDrops?: boolean
}): FeatureTag[] | undefined {
  const tags: FeatureTag[] = []
  if (flags.isNew) tags.push("신작")
  if (flags.isTrending) tags.push("트렌딩")
  if (flags.isRising) tags.push("급상승")
  if (flags.hasDrops) tags.push("드롭스")
  const limited = tags.slice(0, 3)
  return limited.length > 0 ? limited : undefined
}
