"use client"

import { useMemo, useState } from "react"
import { Flame } from "lucide-react"
import { GameCard, type GameCardData } from "@/components/game-card"
import type { TrendingGameRow, HistoricalTrendingRow } from "@/lib/data"
import type { HistoricalTrendingRanges } from "@/lib/trending-date-range"
import { buildFeatureTags } from "@/lib/feature-tags"
import { newReleaseDPlusForBadge } from "@/lib/release-date"

type TrendTab = "live" | "yesterday" | "week" | "month"

const TABS: { id: TrendTab; label: string }[] = [
  { id: "live", label: "실시간" },
  { id: "yesterday", label: "어제" },
  { id: "week", label: "주간 베스트" },
  { id: "month", label: "월간 베스트" },
]

const LIVE_DISPLAY_LIMIT = 8

function formatDotDate(isoYmd: string): string {
  const [y, m, d] = isoYmd.split("-")
  if (!y || !m || !d) return isoYmd
  return `${y}.${m}.${d}`
}

function liveToCardData(games: TrendingGameRow[], yesterdayTrendingIds: Set<number>): GameCardData[] {
  return games.map((game) => ({
    id: game.id,
    title: game.title,
    cover_image_url: game.cover_image_url,
    header_image_url: game.header_image_url ?? game.cover_image_url ?? undefined,
    price_krw: game.price_krw ?? null,
    original_price_krw: game.original_price_krw ?? null,
    discount_rate: game.discount_rate ?? null,
    is_free: game.is_free ?? null,
    totalViewers: game.totalViewers,
    liveStreamCount: game.liveStreamCount,
    topTag: game.topTag,
    topTags: (game as { top_tags?: string[] | null }).top_tags?.slice(0, 2),
    featureTags: buildFeatureTags({
      newReleaseDPlus: newReleaseDPlusForBadge(game.release_date ?? null),
      isTrending: yesterdayTrendingIds.has(game.id),
      isRising: (game.momentum_score ?? 0) > 0,
    }),
  }))
}

function historicalToCardData(
  games: HistoricalTrendingRow[],
  isYesterdayTab: boolean,
  yesterdayTrendingIds: Set<number>,
): GameCardData[] {
  return games.map((game) => ({
    id: game.id,
    title: game.title,
    cover_image_url: game.cover_image_url,
    header_image_url: game.header_image_url ?? game.cover_image_url ?? undefined,
    price_krw: game.price_krw ?? null,
    original_price_krw: game.original_price_krw ?? null,
    discount_rate: game.discount_rate ?? null,
    is_free: game.is_free ?? null,
    totalViewers: game.peak_viewers,
    topTags: game.top_tags?.slice(0, 2),
    featureTags: buildFeatureTags({
      isTrending: isYesterdayTab || yesterdayTrendingIds.has(game.id),
    }),
  }))
}

interface TrendingGamesProps {
  liveGames: TrendingGameRow[]
  historicalTrendingRanges: HistoricalTrendingRanges
  yesterdayGames: HistoricalTrendingRow[]
  weekGames: HistoricalTrendingRow[]
  monthGames: HistoricalTrendingRow[]
  yesterdayTrendingIds: Set<number>
}

export function TrendingGames({
  liveGames,
  historicalTrendingRanges,
  yesterdayGames,
  weekGames,
  monthGames,
  yesterdayTrendingIds,
}: TrendingGamesProps) {
  const [activeTab, setActiveTab] = useState<TrendTab>("live")

  const sortedLiveGames = useMemo(() => {
    if (liveGames.length === 0) return []
    return [...liveGames]
      .sort((a, b) => (b.trend_score ?? 0) - (a.trend_score ?? 0))
      .slice(0, LIVE_DISPLAY_LIMIT)
  }, [liveGames])

  const cardData: GameCardData[] = (() => {
    switch (activeTab) {
      case "live":
        return liveToCardData(sortedLiveGames, yesterdayTrendingIds)
      case "yesterday":
        return historicalToCardData(yesterdayGames, true, yesterdayTrendingIds)
      case "week":
        return historicalToCardData(weekGames, false, yesterdayTrendingIds)
      case "month":
        return historicalToCardData(monthGames, false, yesterdayTrendingIds)
    }
  })()

  const isEmpty = cardData.length === 0
  const emptyMessage =
    activeTab === "live"
      ? "현재 라이브 게임 정보를 불러오는 중입니다."
      : "아직 집계된 데이터가 없습니다. 오늘 이후부터 통계가 쌓입니다."

  const periodRangeLabel = (() => {
    if (activeTab === "live") return null
    const { start, end } = historicalTrendingRanges[activeTab]
    return `${formatDotDate(start)} ~ ${formatDotDate(end)}`
  })()

  return (
    <section className="pb-1">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Flame className="h-5 w-5 shrink-0 text-orange-400" />
            트렌딩 게임
          </h2>
          {periodRangeLabel ? (
            <span className="text-xs font-medium tabular-nums text-muted-foreground sm:text-sm">
              {periodRangeLabel}
            </span>
          ) : null}
        </div>

        <div className="flex gap-1 rounded-lg bg-muted/50 p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="card-grid-home-wrapper -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="card-grid-home">
            {cardData.map((game, index) => (
              <GameCard key={`${activeTab}-${game.id}`} game={game} priority={index < 4} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
