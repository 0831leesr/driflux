"use client"

import { useMemo, useState } from "react"
import { Flame } from "lucide-react"
import { GameCard, type GameCardData } from "@/components/game-card"
import type { TrendingGameRow, HistoricalTrendingRow } from "@/lib/data"

type TrendTab = "live" | "yesterday" | "week" | "month"

type LiveSortMode = "trend" | "momentum"

const TABS: { id: TrendTab; label: string }[] = [
  { id: "live", label: "실시간" },
  { id: "yesterday", label: "어제" },
  { id: "week", label: "주간 베스트" },
  { id: "month", label: "월간 베스트" },
]

const LIVE_DISPLAY_LIMIT = 8

function liveToCardData(games: TrendingGameRow[], showMomentumBadge: boolean): GameCardData[] {
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
    momentumScore:
      showMomentumBadge && (game.momentum_score ?? 0) > 0 ? game.momentum_score : undefined,
  }))
}

function historicalToCardData(games: HistoricalTrendingRow[]): GameCardData[] {
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
  }))
}

interface TrendingGamesProps {
  liveGames: TrendingGameRow[]
  yesterdayGames: HistoricalTrendingRow[]
  weekGames: HistoricalTrendingRow[]
  monthGames: HistoricalTrendingRow[]
}

export function TrendingGames({
  liveGames,
  yesterdayGames,
  weekGames,
  monthGames,
}: TrendingGamesProps) {
  const [activeTab, setActiveTab] = useState<TrendTab>("live")
  const [liveSortMode, setLiveSortMode] = useState<LiveSortMode>("trend")

  const sortedLiveGames = useMemo(() => {
    if (liveGames.length === 0) return []
    const copy = [...liveGames]
    if (liveSortMode === "trend") {
      return copy
        .sort((a, b) => (b.trend_score ?? 0) - (a.trend_score ?? 0))
        .slice(0, LIVE_DISPLAY_LIMIT)
    }
    return copy
      .filter((g) => (g.momentum_score ?? 0) > 0)
      .sort((a, b) => (b.momentum_score ?? 0) - (a.momentum_score ?? 0))
      .slice(0, LIVE_DISPLAY_LIMIT)
  }, [liveGames, liveSortMode])

  const cardData: GameCardData[] = (() => {
    switch (activeTab) {
      case "live":
        return liveToCardData(sortedLiveGames, liveSortMode === "momentum")
      case "yesterday":
        return historicalToCardData(yesterdayGames)
      case "week":
        return historicalToCardData(weekGames)
      case "month":
        return historicalToCardData(monthGames)
    }
  })()

  const isEmpty = cardData.length === 0
  const emptyMessage =
    activeTab === "live"
      ? liveSortMode === "momentum"
        ? "급상승 조건을 충족한 게임이 없습니다. (모멘텀 집계는 수집 주기 후 반영됩니다.)"
        : "현재 라이브 게임 정보를 불러오는 중입니다."
      : "아직 집계된 데이터가 없습니다. 오늘 이후부터 통계가 쌓입니다."

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Flame className="h-5 w-5 text-orange-400" />
            트렌딩 게임
          </h2>

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

        {activeTab === "live" && (
          <div className="flex gap-1 rounded-lg bg-muted/50 p-1 w-fit">
            <button
              type="button"
              onClick={() => setLiveSortMode("trend")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                liveSortMode === "trend"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🔥 트렌딩
            </button>
            <button
              type="button"
              onClick={() => setLiveSortMode("momentum")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                liveSortMode === "momentum"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🚀 급상승
            </button>
          </div>
        )}
      </div>

      {isEmpty ? (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="card-grid-4-wrapper -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="card-grid-4">
            {cardData.map((game, index) => (
              <GameCard
                key={`${activeTab}-${liveSortMode}-${game.id}`}
                game={game}
                priority={index < 4}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
