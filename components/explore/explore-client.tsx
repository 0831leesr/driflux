"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { TrendingUp, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GameCard, type GameCardData } from "@/components/game-card"
import { TagSearchInput } from "@/components/explore/tag-search-input"
import { MainTabNav } from "@/components/main-tab-nav"
import type { TagRow, HistoricalTrendingRow } from "@/lib/data"
import type { HistoricalTrendingRanges } from "@/lib/trending-date-range"
import type { ExploreLiveListItem } from "@/lib/match-top-live-games"
import { getChzzkGameCategoryWebLivesUrl } from "@/lib/chzzk"
import { getDisplayGameTitle, getEffectiveDiscountRate } from "@/lib/utils"
import { buildFeatureTags } from "@/lib/feature-tags"

const PAGE_SIZE = 16

type ExploreTrendPeriod = "yesterday" | "week" | "month"

const EXPLORE_TREND_TABS: { id: ExploreTrendPeriod; label: string }[] = [
  { id: "yesterday", label: "어제" },
  { id: "week", label: "주간 베스트" },
  { id: "month", label: "월간 베스트" },
]

function formatDotDate(isoYmd: string): string {
  const [y, m, d] = isoYmd.split("-")
  if (!y || !m || !d) return isoYmd
  return `${y}.${m}.${d}`
}

interface ExploreClientProps {
  initialMode: "live" | "trend"
  exploreLiveItems: ExploreLiveListItem[]
  trendGamesYesterday: HistoricalTrendingRow[]
  trendGamesWeek: HistoricalTrendingRow[]
  trendGamesMonth: HistoricalTrendingRow[]
  historicalTrendingRanges: HistoricalTrendingRanges
  allTags: TagRow[]
  selectedTagName?: string
  /** 어제 기준 트렌딩 게임 ID 목록 (특징 태그 배지용) */
  yesterdayTrendingIds?: number[]
  /** 오늘 기준 급상승(momentum_score > 0) 게임 ID 목록 (특징 태그 배지용) */
  risingGameIds?: number[]
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function exploreLiveItemToCardData(
  item: ExploreLiveListItem,
  yesterdaySet: Set<number>,
  risingSet: Set<number>,
): GameCardData {
  const { live, db } = item
  const cover = db?.cover_image_url ?? live.posterImageUrl
  const header = (db?.header_image_url ?? db?.cover_image_url) ?? live.posterImageUrl
  const effectiveDiscount = db ? getEffectiveDiscountRate(db.discount_rate) : 0

  const isNew = db?.release_date
    ? Date.now() - new Date(db.release_date).getTime() <= THIRTY_DAYS_MS
    : false

  return {
    id: db?.id ?? 0,
    title: db
      ? getDisplayGameTitle({ korean_title: db.korean_title, title: db.title })
      : live.title,
    korean_title: db?.korean_title,
    cover_image_url: cover,
    header_image_url: header,
    price_krw: db?.price_krw ?? null,
    original_price_krw: db?.original_price_krw ?? null,
    discount_rate: db && effectiveDiscount > 0 ? effectiveDiscount : null,
    is_free: db?.is_free ?? null,
    topTag: db?.top_tags?.[0],
    topTags: db?.top_tags?.slice(0, 2),
    totalViewers: live.concurrentUserCount,
    liveStreamCount: live.openLiveCount,
    cardHref: db ? undefined : getChzzkGameCategoryWebLivesUrl(live.categoryId),
    hideFavorite: !db,
    featureTags: db
      ? buildFeatureTags({
          isNew,
          isTrending: yesterdaySet.has(db.id),
          isRising: risingSet.has(db.id),
        })
      : undefined,
  }
}

function trendToCardData(
  game: HistoricalTrendingRow,
  yesterdaySet: Set<number>,
  isYesterdayPeriodTab: boolean,
): GameCardData {
  return {
    id: game.id,
    title: game.title,
    cover_image_url: game.cover_image_url,
    header_image_url: game.header_image_url ?? undefined,
    price_krw: game.price_krw ?? null,
    original_price_krw: game.original_price_krw ?? null,
    discount_rate: game.discount_rate ?? null,
    is_free: game.is_free ?? null,
    topTag: game.top_tags?.[0],
    topTags: game.top_tags?.slice(0, 2) ?? undefined,
    totalViewers: game.peak_viewers > 0 ? game.peak_viewers : undefined,
    liveStreamCount: 0,
    featureTags: buildFeatureTags({
      isTrending: isYesterdayPeriodTab || yesterdaySet.has(game.id),
    }),
  }
}

export function ExploreClient({
  initialMode,
  exploreLiveItems,
  trendGamesYesterday,
  trendGamesWeek,
  trendGamesMonth,
  historicalTrendingRanges,
  allTags,
  selectedTagName,
  yesterdayTrendingIds: yesterdayTrendingIdsProp,
  risingGameIds: risingGameIdsProp,
}: ExploreClientProps) {
  const router = useRouter()
  const [shownCount, setShownCount] = useState(PAGE_SIZE)
  const [activeTrendPeriod, setActiveTrendPeriod] = useState<ExploreTrendPeriod>("yesterday")

  const yesterdaySet = useMemo(
    () => new Set(yesterdayTrendingIdsProp ?? []),
    [yesterdayTrendingIdsProp],
  )

  const risingSet = useMemo(
    () => new Set(risingGameIdsProp ?? []),
    [risingGameIdsProp],
  )

  useEffect(() => {
    setShownCount(PAGE_SIZE)
  }, [initialMode, activeTrendPeriod])

  const setMode = (mode: "live" | "trend") => {
    const params = new URLSearchParams()
    params.set("mode", mode)
    router.push(`/explore?${params.toString()}`, { scroll: false })
  }

  const setTag = (tagName: string | undefined) => {
    const params = new URLSearchParams()
    params.set("mode", "trend")
    if (tagName) params.set("tags", encodeURIComponent(tagName))
    router.push(`/explore?${params.toString()}`, { scroll: false })
    setShownCount(PAGE_SIZE)
  }

  const handleAddTag = (tagName: string) => {
    setTag(tagName)
  }

  const visibleExploreLive = exploreLiveItems.slice(0, shownCount)
  const hasMoreLive = shownCount < exploreLiveItems.length

  const trendGamesForPeriod = (() => {
    switch (activeTrendPeriod) {
      case "yesterday":
        return trendGamesYesterday
      case "week":
        return trendGamesWeek
      case "month":
        return trendGamesMonth
    }
  })()

  const isYesterdayPeriodTab = activeTrendPeriod === "yesterday"
  const displayedTrend = trendGamesForPeriod.map((g) => trendToCardData(g, yesterdaySet, isYesterdayPeriodTab))
  const visibleTrend = displayedTrend.slice(0, shownCount)
  const hasMoreTrend = shownCount < displayedTrend.length

  const explorePeriodRangeLabel = (() => {
    const { start, end } = historicalTrendingRanges[activeTrendPeriod]
    return `${formatDotDate(start)} ~ ${formatDotDate(end)}`
  })()

  return (
    <>
      <MainTabNav activeTab="explore" />
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Mode Toggle */}
        <div className="mb-8 flex gap-2">
          <button
            onClick={() => setMode("live")}
            className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
              initialMode === "live"
                ? "bg-[hsl(var(--live-red))] text-white shadow-md shadow-[hsl(var(--live-red))]/25"
                : "border border-border bg-card text-muted-foreground hover:border-[hsl(var(--live-red))]/40 hover:text-foreground"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                initialMode === "live" ? "animate-pulse bg-white" : "bg-muted-foreground"
              }`}
            />
            🔴 라이브 탐색
          </button>
          <button
            onClick={() => setMode("trend")}
            className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
              initialMode === "trend"
                ? "bg-[hsl(var(--neon-purple))] text-white shadow-md shadow-[hsl(var(--neon-purple))]/25"
                : "border border-border bg-card text-muted-foreground hover:border-[hsl(var(--neon-purple))]/40 hover:text-foreground"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            📈 트렌드 탐색
          </button>
        </div>

        {/* ── LIVE MODE ── */}
        {initialMode === "live" && (
          <>
            {exploreLiveItems.length === 0 ? (
              <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
                현재 라이브 정보를 불러오는 중입니다.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="card-grid-4-wrapper -mx-4 px-4 sm:mx-0 sm:px-0">
                  <div className="card-grid-4">
                    {visibleExploreLive.map((item, i) => (
                      <GameCard
                        key={item.live.categoryId}
                        game={exploreLiveItemToCardData(item, yesterdaySet, risingSet)}
                        priority={i < 4}
                      />
                    ))}
                  </div>
                </div>
                {hasMoreLive && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setShownCount((n) => n + PAGE_SIZE)}
                      className="min-w-[160px] border-border"
                    >
                      더 보기
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── TREND MODE ── */}
        {initialMode === "trend" && (
          <>
            {/* Tag Filter Panel */}
            <div className="mb-6 rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">장르 / 태그 필터</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    태그를 선택하면 해당 장르의 게임을 트렌드 점수 순으로 확인합니다
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTagName && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTag(undefined)}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      필터 해제
                    </Button>
                  )}
                  <TagSearchInput
                    onAddTag={handleAddTag}
                    selectedTags={selectedTagName ? [selectedTagName] : []}
                    placeholder="태그 검색..."
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => {
                  const isSelected = selectedTagName === tag.name
                  return (
                    <Badge
                      key={tag.id}
                      variant={isSelected ? "default" : "outline"}
                      className={`cursor-pointer select-none gap-1.5 px-4 py-2 text-sm font-medium transition-all hover:scale-105 ${
                        isSelected
                          ? "border-2 border-[hsl(var(--neon-purple))] bg-[hsl(var(--neon-purple))] !text-white shadow-md hover:bg-[hsl(var(--neon-purple))]/90"
                          : "border border-border bg-card/50 text-muted-foreground hover:border-[hsl(var(--neon-purple))]/40 hover:text-foreground"
                      }`}
                      onClick={() => setTag(isSelected ? undefined : tag.name)}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                      {tag.name}
                    </Badge>
                  )
                })}
              </div>
            </div>

            {/* 기간 분류 — 홈 트렌딩 게임과 동일(실시간 제외) */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs font-medium tabular-nums text-muted-foreground sm:text-sm">
                {explorePeriodRangeLabel}
              </span>
              <div className="flex gap-1 rounded-lg bg-muted/50 p-1 w-fit">
                {EXPLORE_TREND_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTrendPeriod(tab.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeTrendPeriod === tab.id
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results header — 태그 선택 시에만 표시 */}
            {selectedTagName && (
              <div className="mb-4 flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  <span className="text-[hsl(var(--neon-purple))]"># {selectedTagName}</span>{" "}
                  트렌드
                </h2>
                <span className="text-sm text-muted-foreground">
                  {displayedTrend.length > 0
                    ? `${displayedTrend.length}개`
                    : "데이터 없음"}
                </span>
              </div>
            )}

            {displayedTrend.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
                <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <p className="text-lg font-medium text-muted-foreground">
                  {selectedTagName
                    ? `#${selectedTagName} 태그를 가진 게임이 없습니다`
                    : "아직 집계된 트렌드 데이터가 없습니다"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedTagName
                    ? "다른 태그를 선택해 보세요."
                    : "daily_game_stats가 쌓이면 여기에 데이터가 표시됩니다."}
                </p>
                {selectedTagName && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTag(undefined)}
                    className="mt-4"
                  >
                    전체 보기
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="card-grid-4-wrapper -mx-4 px-4 sm:mx-0 sm:px-0">
                  <div className="card-grid-4">
                    {visibleTrend.map((game, i) => (
                      <GameCard key={game.id} game={game} priority={i < 4} />
                    ))}
                  </div>
                </div>
                {hasMoreTrend && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setShownCount((n) => n + PAGE_SIZE)}
                      className="min-w-[160px] border-border"
                    >
                      더 보기
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </>
  )
}
