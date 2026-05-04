import {
  fetchUpcomingEvents,
  fetchEsportsChannels,
  fetchAllGamesForHome,
  fetchTodayDailyGameStatsForKstToday,
  getHistoricalTrending,
  type HomeGameRow,
  type HiddenGemsRow,
  type NewReleasesRow,
  type TrendingGameRow,
  type GamesWithDropsRow,
} from "@/lib/data"
import { matchTopLiveGamesToTrendingRows, fetchAndMergeHomeGamesForTopLive } from "@/lib/match-top-live-games"
import { getTopLiveGames, type TopLiveGame } from "@/lib/chzzk"
import { getDisplayGameTitle, getEffectiveDiscountRate } from "@/lib/utils"
import { HomeClient } from "@/components/home-client"
import { getHistoricalTrendingDateRange } from "@/lib/trending-date-range"
import {
  kstCalendarDaysSinceRelease,
  NEW_RELEASE_MAX_CALENDAR_DAYS,
} from "@/lib/release-date"

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
      const effectiveDiscount = getEffectiveDiscountRate(db.discount_rate)
      return [
        {
          score,
          id: db.id,
          slug: db.slug ?? null,
          title: getDisplayGameTitle({ korean_title: db.korean_title, title: db.title }),
          cover_image_url: db.cover_image_url,
          header_image_url: db.header_image_url ?? db.cover_image_url,
          totalViewers: live.concurrentUserCount,
          liveStreamCount: live.openLiveCount,
          price_krw: db.price_krw ?? null,
          original_price_krw: db.original_price_krw ?? null,
          discount_rate: effectiveDiscount > 0 ? effectiveDiscount : null,
          is_free: db.is_free ?? null,
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
  return liveGames
    .flatMap((live) => {
      const db = lookup(live)
      if (!db || !db.release_date) return []

      const daysSinceRelease = kstCalendarDaysSinceRelease(db.release_date)
      if (
        daysSinceRelease === null ||
        daysSinceRelease < 0 ||
        daysSinceRelease > NEW_RELEASE_MAX_CALENDAR_DAYS
      ) {
        return []
      }

      const score = live.concurrentUserCount / Math.sqrt(daysSinceRelease + 1)
      const effectiveDiscount = getEffectiveDiscountRate(db.discount_rate)

      return [
        {
          score,
          id: db.id,
          slug: db.slug ?? null,
          title: getDisplayGameTitle({ korean_title: db.korean_title, title: db.title }),
          cover_image_url: db.cover_image_url,
          header_image_url: db.header_image_url ?? db.cover_image_url,
          totalViewers: live.concurrentUserCount,
          liveStreamCount: live.openLiveCount,
          daysSinceRelease,
          price_krw: db.price_krw ?? null,
          original_price_krw: db.original_price_krw ?? null,
          discount_rate: effectiveDiscount > 0 ? effectiveDiscount : null,
          is_free: db.is_free ?? null,
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

async function homeSafe<T>(label: string, promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise
  } catch (err) {
    console.error(
      `[RichzemHome] ${label} failed (transient network or upstream):`,
      err instanceof Error ? err.message : err,
    )
    return fallback
  }
}

export default async function RichzemHome() {
  const [
    topLiveGames,
    yesterdayTrending,
    weekTrending,
    monthTrending,
    dbGames,
    upcomingEvents,
    esportsChannels,
    todayDailyStatsByGameId,
  ] = await Promise.all([
    homeSafe("getTopLiveGames", getTopLiveGames(50), []),
    homeSafe("getHistoricalTrending(yesterday)", getHistoricalTrending("yesterday"), []),
    homeSafe("getHistoricalTrending(week)", getHistoricalTrending("week"), []),
    homeSafe("getHistoricalTrending(month)", getHistoricalTrending("month"), []),
    homeSafe("fetchAllGamesForHome", fetchAllGamesForHome(), []),
    homeSafe("fetchUpcomingEvents", fetchUpcomingEvents(), []),
    homeSafe("fetchEsportsChannels", fetchEsportsChannels(), []),
    homeSafe("fetchTodayDailyGameStatsForKstToday", fetchTodayDailyGameStatsForKstToday(), new Map()),
  ])

  // 공유 DB 룩업 인덱스 (한 번만 생성)
  const lookup = buildGameLookup(dbGames)

  // 서버 사이드 컨퓨테이션 — 라이브 매칭 전체 + 당일 daily_game_stats 병합 (클라이언트에서 트렌드/급상승 정렬)
  const dbGamesForLiveMatch = await fetchAndMergeHomeGamesForTopLive(topLiveGames, dbGames)
  const allMatchedLive = matchTopLiveGamesToTrendingRows(topLiveGames, dbGamesForLiveMatch)
  const trendingLive: TrendingGameRow[] = allMatchedLive.map((g) => {
    const s = todayDailyStatsByGameId.get(String(g.id))
    return {
      ...g,
      trend_score: s?.trend_score ?? 0,
      momentum_score: s?.momentum_score ?? 0,
    }
  })
  const risingTrendingGames: TrendingGameRow[] = trendingLive
    .filter((g) => (g.momentum_score ?? 0) > 0)
    .sort((a, b) => (b.momentum_score ?? 0) - (a.momentum_score ?? 0))
    .slice(0, 8)
  const hiddenGemsGames = computeHiddenGems(topLiveGames, lookup)
  const newReleasesGames = computeNewReleases(topLiveGames, lookup)
  // games_with_drops DB 뷰 삭제로 인해 라이브 API에서 drops 정보를 가져올 수 없음 → 빈 배열 유지
  const gamesWithDrops: GamesWithDropsRow[] = []

  const historicalTrendingRanges = {
    yesterday: getHistoricalTrendingDateRange("yesterday"),
    week: getHistoricalTrendingDateRange("week"),
    month: getHistoricalTrendingDateRange("month"),
  }

  return (
    <HomeClient
      trendingLive={trendingLive}
      risingTrendingGames={risingTrendingGames}
      historicalTrendingRanges={historicalTrendingRanges}
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
