import {
  fetchUpcomingEvents,
  fetchEsportsChannels,
  fetchAllGamesForHome,
  fetchTodayDailyGameStatsByGameIds,
  getHistoricalTrending,
  type HomeGameRow,
  type HiddenGemsRow,
  type NewReleasesRow,
  type TrendingGameRow,
  type GamesWithDropsRow,
} from "@/lib/data"
import { matchTopLiveGamesToTrendingRows } from "@/lib/match-top-live-games"
import { getTopLiveGames, type TopLiveGame } from "@/lib/chzzk"
import { getDisplayGameTitle, getEffectiveDiscountRate } from "@/lib/utils"
import { HomeClient } from "@/components/home-client"

/* ─────────────────────────────────────────────────────────
   Server-side computation helpers (home-specific)
───────────────────────────────────────────────────────── */

/** DB 룩업 인덱스 — computeHiddenGems / computeNewReleases 전용 */
function buildGameLookup(dbGames: HomeGameRow[]) {
  const byKorean = new Map<string, HomeGameRow>()
  const byEnglish = new Map<string, HomeGameRow>()

  for (const g of dbGames) {
    if (g.korean_title) byKorean.set(g.korean_title.toLowerCase().trim(), g)
    if (g.english_title) {
      byEnglish.set(g.english_title.toLowerCase().replace(/\s+/g, "_"), g)
      byEnglish.set(g.english_title.toLowerCase(), g)
    }
    byKorean.set(g.title.toLowerCase().trim(), g)
  }

  return (live: TopLiveGame): HomeGameRow | null =>
    byKorean.get(live.title.toLowerCase().trim()) ??
    byEnglish.get(live.categoryId.toLowerCase()) ??
    null
}

/**
 * 숨겨진 꿀잼 계산
 * - 조건: openLiveCount 5~50, concurrentUserCount >= 100, DB 매칭 필요
 * - 점수: concurrentUserCount / (openLiveCount + 10)²
 */
function computeHiddenGems(
  liveGames: TopLiveGame[],
  lookup: (l: TopLiveGame) => HomeGameRow | null
): HiddenGemsRow[] {
  return liveGames
    .filter(
      (live) =>
        live.openLiveCount >= 5 &&
        live.openLiveCount <= 50 &&
        live.concurrentUserCount >= 100
    )
    .flatMap((live) => {
      const db = lookup(live)
      if (!db) return []
      const score = live.concurrentUserCount / Math.pow(live.openLiveCount + 10, 2)
      return [
        {
          score,
          id: db.id,
          title: getDisplayGameTitle({ korean_title: db.korean_title, title: db.title }),
          cover_image_url: db.cover_image_url,
          header_image_url: db.header_image_url ?? db.cover_image_url,
          totalViewers: live.concurrentUserCount,
          liveStreamCount: live.openLiveCount,
        },
      ]
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ score: _score, ...rest }) => rest as HiddenGemsRow)
}

/**
 * 신작 게임 계산
 * - 조건: DB release_date 30일 이내 + 현재 라이브 방송 있음
 * - 점수: concurrentUserCount / sqrt(daysSinceRelease + 1)
 */
function computeNewReleases(
  liveGames: TopLiveGame[],
  lookup: (l: TopLiveGame) => HomeGameRow | null
): NewReleasesRow[] {
  const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000

  return liveGames
    .flatMap((live) => {
      const db = lookup(live)
      if (!db || !db.release_date) return []

      const releaseMs = new Date(db.release_date).getTime()
      if (isNaN(releaseMs) || releaseMs < thirtyDaysAgoMs) return []

      const daysSinceRelease = Math.max(0, Math.floor((Date.now() - releaseMs) / 86_400_000))
      const score = live.concurrentUserCount / Math.sqrt(daysSinceRelease + 1)

      return [
        {
          score,
          id: db.id,
          title: getDisplayGameTitle({ korean_title: db.korean_title, title: db.title }),
          cover_image_url: db.cover_image_url,
          header_image_url: db.header_image_url ?? db.cover_image_url,
          totalViewers: live.concurrentUserCount,
          liveStreamCount: live.openLiveCount,
          daysSinceRelease,
        },
      ]
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ score: _score, ...rest }) => rest as NewReleasesRow)
}

/* ─────────────────────────────────────────────────────────
   Server Component (page root)
───────────────────────────────────────────────────────── */

export default async function RichzemHome() {
  const [
    topLiveGames,
    yesterdayTrending,
    weekTrending,
    monthTrending,
    dbGames,
    upcomingEvents,
    esportsChannels,
  ] = await Promise.all([
    getTopLiveGames(50),
    getHistoricalTrending("yesterday"),
    getHistoricalTrending("week"),
    getHistoricalTrending("month"),
    fetchAllGamesForHome(),
    fetchUpcomingEvents(),
    fetchEsportsChannels(),
  ])

  // 공유 DB 룩업 인덱스 (한 번만 생성)
  const lookup = buildGameLookup(dbGames)

  // 서버 사이드 컨퓨테이션 — 라이브 매칭 전체 + 당일 daily_game_stats 병합 (클라이언트에서 트렌드/급상승 정렬)
  const allMatchedLive = matchTopLiveGamesToTrendingRows(topLiveGames, dbGames)
  const todayStatsMap = await fetchTodayDailyGameStatsByGameIds(allMatchedLive.map((g) => g.id))
  const trendingLive: TrendingGameRow[] = allMatchedLive.map((g) => {
    const s = todayStatsMap.get(g.id)
    return {
      ...g,
      trend_score: s?.trend_score ?? 0,
      momentum_score: s?.momentum_score ?? 0,
    }
  })
  const hiddenGemsGames = computeHiddenGems(topLiveGames, lookup)
  const newReleasesGames = computeNewReleases(topLiveGames, lookup)
  // games_with_drops DB 뷰 삭제로 인해 라이브 API에서 drops 정보를 가져올 수 없음 → 빈 배열 유지
  const gamesWithDrops: GamesWithDropsRow[] = []

  return (
    <HomeClient
      trendingLive={trendingLive}
      yesterdayTrending={yesterdayTrending}
      weekTrending={weekTrending}
      monthTrending={monthTrending}
      gamesWithDrops={gamesWithDrops}
      hiddenGemsGames={hiddenGemsGames}
      newReleasesGames={newReleasesGames}
      upcomingEvents={upcomingEvents}
      esportsChannels={esportsChannels}
    />
  )
}
