/** 다시보기(v2 /videos) 정렬 — API가 orderType 쿼리를 무시하는 경우 대비 */

export type ChzzkVodListOrder = "POPULAR" | "RECENT"

export function chzzkVodPublishMs(item: {
  publishDateAt?: number
  publishDate?: string | null
}): number {
  const at = item.publishDateAt
  if (typeof at === "number" && !Number.isNaN(at) && at > 0) return at
  const p = item.publishDate?.trim()
  if (!p) return 0
  const normalized = /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/.test(p)
    ? p.replace(" ", "T")
    : p
  const t = Date.parse(normalized)
  return Number.isNaN(t) ? 0 : t
}

/**
 * - RECENT: 게시 시각 내림차순
 * - POPULAR: 조회수 → livePv → 최신순
 */
export function sortChzzkVodList<
  T extends {
    readCount: number
    publishDate?: string | null
    publishDateAt?: number
    livePv?: number
  },
>(items: T[], orderType: ChzzkVodListOrder): T[] {
  const arr = [...items]
  if (orderType === "RECENT") {
    arr.sort((a, b) => chzzkVodPublishMs(b) - chzzkVodPublishMs(a))
  } else {
    arr.sort((a, b) => {
      const rc = b.readCount - a.readCount
      if (rc !== 0) return rc
      const lp = (b.livePv ?? 0) - (a.livePv ?? 0)
      if (lp !== 0) return lp
      return chzzkVodPublishMs(b) - chzzkVodPublishMs(a)
    })
  }
  return arr
}
