import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import {
  buildChzzkCategoriesLiveUrl,
  fetchChzzkCategoriesLiveTextFirst,
  type FetchChzzkCategoriesLiveTextFirstResult,
} from "@/lib/chzzk"

/**
 * Cron Job API: 일일 피크 통계 + 급상승(Momentum) 갱신
 *
 * GET /api/cron/update-daily-stats
 *
 * - 스케줄은 외부(예: 30분 주기 GitHub Actions 등)에서 호출 — vercel.json crons 비움
 * - Chzzk categories/live API에서 실시간 게임별 시청자 수 및 방송 수 수집
 * - games 테이블의 title/korean_title/english_title과 매핑
 * - daily_game_stats Upsert:
 *   - peak_viewers / peak_stream_count / trend_score: GREATEST(기존, 현재)
 *   - previous_viewers ← 오늘 첫 스냅샷 시점의 시청자 수(Baseline), 이후 크론에서 유지
 *   - current_viewers ← 이번 API 값
 *   - momentum_score: delta = current - baseline, delta >= 100 이면 delta(반올림), 그 외 0(최고점 유지 없음)
 *
 * trend_score 공식:
 *   concurrentUserCount * (1 + LN(openLiveCount + 1))
 */
export const maxDuration = 60

interface ChzzkCategoryItem {
  categoryId: string
  categoryValue: string
  concurrentUserCount: number
  openLiveCount: number
  posterImageUrl: string | null
}

interface ExistingDailyStatRow {
  game_id: number
  peak_viewers: number | null
  peak_stream_count: number | null
  trend_score: number | null
  current_viewers: number | null
  /** 오늘 누적 모멘텀 기준: 해당 일자 최초 기록 시점 시청자 수 */
  previous_viewers: number | null
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").trim()
}

function buildRawChzzkDebugSnippet(r: FetchChzzkCategoriesLiveTextFirstResult): string {
  if (r.parseError) {
    return `JSON.parse error: ${r.parseError} | body: ${r.rawText.slice(0, 600)}`
  }
  if (!r.httpOk) {
    return `HTTP ${r.httpStatus} | body: ${r.rawText.slice(0, 600)}`
  }
  return r.rawText.slice(0, 800)
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    const authHeader = request.headers.get("authorization")
    const expectedAuth = process.env.CRON_SECRET
      ? `Bearer ${process.env.CRON_SECRET}`
      : null

    if (!expectedAuth || authHeader !== expectedAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const startTime = Date.now()
  console.log("[DailyStats] Starting — fetching from Chzzk categories/live API...")

  try {
    // ── Step 1: Chzzk API — text() → 로그 → JSON.parse (HTML/비JSON 대비) ──
    let categories: ChzzkCategoryItem[] = []
    let chzzkFetch: FetchChzzkCategoriesLiveTextFirstResult | null = null

    try {
      chzzkFetch = await fetchChzzkCategoriesLiveTextFirst(buildChzzkCategoriesLiveUrl(), {
        cache: "no-store",
      })
      categories = chzzkFetch.categories as ChzzkCategoryItem[]

      if (categories.length === 0) {
        console.warn(
          "[DailyStats] No category rows after parse — raw prefix:",
          chzzkFetch.rawText.slice(0, 1000)
        )
      }
    } catch (fetchErr) {
      console.error(
        "[DailyStats] Chzzk fetch exception:",
        fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
      )
    }

    if (categories.length === 0) {
      console.warn("[DailyStats] No categories returned from Chzzk — skipping upsert.")
      return NextResponse.json({
        success: true,
        message: "No live categories found (Chzzk API may be unavailable)",
        rawChzzkData: chzzkFetch ? buildRawChzzkDebugSnippet(chzzkFetch) : "no fetch result",
        stats: { gamesProcessed: 0, upserted: 0, failed: 0 },
        duration: Date.now() - startTime,
      })
    }

    console.log(`[DailyStats] Fetched ${categories.length} live categories from Chzzk.`)

    // ── Step 2: games 테이블에서 title 룩업 맵 구성 ──
    const supabase = createAdminClient()
    const { data: allGames, error: gamesError } = await supabase
      .from("games")
      .select("id, title, korean_title, english_title")

    if (gamesError) {
      console.error("[DailyStats] Failed to fetch games:", gamesError.message)
      return NextResponse.json(
        { error: "Failed to fetch games", details: gamesError.message },
        { status: 500 }
      )
    }

    // title 정규화 → game_id 룩업 맵
    const koreanMap = new Map<string, number>()
    const englishMap = new Map<string, number>()
    const titleMap = new Map<string, number>()

    for (const g of allGames ?? []) {
      if (g.korean_title) koreanMap.set(normalize(g.korean_title), g.id)
      if (g.english_title) englishMap.set(normalize(g.english_title), g.id)
      titleMap.set(normalize(g.title), g.id)
    }

    // ── Step 3: Chzzk 카테고리를 game_id에 매핑 + 집계 ──
    type GameStats = { concurrentUserCount: number; openLiveCount: number }
    const statsMap = new Map<number, GameStats>()

    for (const cat of categories) {
      const gameId =
        koreanMap.get(normalize(cat.categoryValue)) ??
        englishMap.get(normalize(cat.categoryId)) ??
        titleMap.get(normalize(cat.categoryValue)) ??
        titleMap.get(normalize(cat.categoryId))

      if (!gameId) continue

      const prev = statsMap.get(gameId)
      // 중복 매핑 시 더 높은 값 유지
      if (!prev || cat.concurrentUserCount > prev.concurrentUserCount) {
        statsMap.set(gameId, {
          concurrentUserCount: cat.concurrentUserCount,
          openLiveCount: cat.openLiveCount,
        })
      }
    }

    console.log(`[DailyStats] Matched ${statsMap.size} games in DB out of ${categories.length} Chzzk categories.`)

    if (statsMap.size === 0) {
      console.warn("[DailyStats] No games matched — check title data in games table.")
      return NextResponse.json({
        success: true,
        message: "No matching games found in DB",
        stats: { categoriesFetched: categories.length, gamesMatched: 0, upserted: 0, failed: 0 },
        duration: Date.now() - startTime,
      })
    }

    // ── Step 4: 오늘 날짜 (UTC 기준) ──
    const today = new Date().toISOString().slice(0, 10)

    // ── Step 5: 기존 today 레코드 일괄 조회 (peak 비교용) ──
    const gameIds = Array.from(statsMap.keys())
    const { data: existingRows, error: existingError } = await supabase
      .from("daily_game_stats")
      .select("game_id, peak_viewers, peak_stream_count, trend_score, current_viewers, previous_viewers")
      .in("game_id", gameIds)
      .eq("record_date", today)

    if (existingError) {
      console.error("[DailyStats] Failed to fetch existing stats:", existingError.message)
      return NextResponse.json(
        { error: "Failed to fetch existing stats", details: existingError.message },
        { status: 500 }
      )
    }

    const existingMap = new Map<
      number,
      {
        peak_viewers: number
        peak_stream_count: number
        trend_score: number
        current_viewers: number
        previous_viewers: number | null
      }
    >()
    for (const row of existingRows ?? []) {
      const r = row as ExistingDailyStatRow
      existingMap.set(r.game_id, {
        peak_viewers: r.peak_viewers ?? 0,
        peak_stream_count: r.peak_stream_count ?? 0,
        trend_score: r.trend_score ?? 0,
        current_viewers: r.current_viewers ?? 0,
        previous_viewers: r.previous_viewers,
      })
    }

    // ── Step 6: Upsert 페이로드 구성 ──
    // Chzzk(statsMap)을 기준으로 순회 — existingMap에 기록이 없어도 신규 삽입 보장
    type UpsertRow = {
      game_id: number
      record_date: string
      peak_viewers: number
      peak_stream_count: number
      trend_score: number
      current_viewers: number
      previous_viewers: number
      momentum_score: number
    }

    let newInserts = 0
    let updates = 0
    const upsertRows: UpsertRow[] = []

    for (const [gameId, current] of statsMap.entries()) {
      const currentTrendScore =
        current.concurrentUserCount * (1 + Math.log(current.openLiveCount + 1))

      const prev = existingMap.get(gameId)
      const isFirstInsert = prev === undefined
      const newViewers = current.concurrentUserCount

      // 오늘 Baseline: 이미 저장된 previous_viewers가 있으면 유지, 없으면 이번 시청자 수로 설정(첫 기록)
      const baselineViewers =
        prev != null && prev.previous_viewers != null
          ? prev.previous_viewers
          : newViewers
      const delta = newViewers - baselineViewers
      const momentumScore = !isFirstInsert && delta >= 100 ? Math.round(delta) : 0

      upsertRows.push({
        game_id: gameId,
        record_date: today,
        peak_viewers: Math.max(newViewers, prev?.peak_viewers ?? 0),
        peak_stream_count: Math.max(current.openLiveCount, prev?.peak_stream_count ?? 0),
        trend_score: Math.max(currentTrendScore, prev?.trend_score ?? 0),
        current_viewers: newViewers,
        previous_viewers: baselineViewers,
        momentum_score: momentumScore,
      })

      if (isFirstInsert) newInserts++
      else updates++
    }

    console.log(
      `[DailyStats] Upsert payload ready — total: ${upsertRows.length}, new: ${newInserts}, update: ${updates}`
    )

    // ── Step 7: Batch Upsert (100개씩) ──
    const BATCH_SIZE = 100
    let upserted = 0
    let failed = 0

    for (let i = 0; i < upsertRows.length; i += BATCH_SIZE) {
      const batch = upsertRows.slice(i, i + BATCH_SIZE)
      const batchNo = Math.floor(i / BATCH_SIZE) + 1
      const { error: upsertError } = await supabase
        .from("daily_game_stats")
        .upsert(batch, { onConflict: "game_id,record_date", ignoreDuplicates: false })

      if (upsertError) {
        console.error(
          `[DailyStats] Upsert failed (batch ${batchNo}/${Math.ceil(upsertRows.length / BATCH_SIZE)}):`,
          upsertError.message,
          "| code:", upsertError.code,
          "| details:", upsertError.details,
          "| hint:", upsertError.hint
        )
        failed += batch.length
      } else {
        upserted += batch.length
      }
    }

    const duration = Date.now() - startTime
    console.log(
      `[DailyStats] Done in ${duration}ms — date: ${today}, chzzk: ${categories.length}, matched: ${statsMap.size}, new: ${newInserts}, updated: ${updates}, upserted: ${upserted}, failed: ${failed}`
    )

    return NextResponse.json({
      success: true,
      message: `Processed ${categories.length} Chzzk categories, matched ${statsMap.size} games for ${today} (upserted: ${upserted}, failed: ${failed})`,
      stats: {
        recordDate: today,
        categoriesFetched: categories.length,
        gamesMatched: statsMap.size,
        upserted,
        failed,
      },
      duration,
    })
  } catch (error) {
    console.error("[DailyStats] Fatal error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
