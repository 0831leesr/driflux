import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import {
  buildChzzkCategoriesLiveUrl,
  fetchChzzkCategoriesLiveTextFirst,
  getChzzkStreamsByCategory,
  type FetchChzzkCategoriesLiveTextFirstResult,
} from "@/lib/chzzk"
import { logCronAgainstHobbyTarget } from "@/lib/cron-hobby-log"
import {
  getKstTodayDateString,
  normalizeStreamerName,
} from "@/lib/actions/update-top-streamers"
import { isMissingOrUnknownColumnError } from "@/lib/supabase/column-error"

/**
 * Cron Job API: 일일 피크 통계 + 급상승(Momentum) 갱신
 *
 * GET /api/cron/update-daily-stats
 *
 * - 스케줄은 외부(예: 30분 주기 GitHub Actions 등)에서 호출 — vercel.json crons 비움
 * - Chzzk categories/live API에서 실시간 게임별 시청자 수 및 방송 수 수집
 * - games 테이블의 title/korean_title/english_title과 매핑
 * - (추가) 매칭된 상위 게임에 대해 categories/GAME/{id}/lives로 라이브 목록을 받아
 *   streamer_game_logs에 KST 당일·채널명·시청자 피크 병합 upsert
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

/** categories/live에서 game_id에 매칭된 행 중 시청자 최고치일 때의 Chzzk categoryId(영문) */
type GameStatsWithCategory = {
  concurrentUserCount: number
  openLiveCount: number
  chzzkCategoryId: string
}

/** Vercel 60초 내 완료를 위해 라이브 목록 API 호출 상한 */
const MAX_GAMES_FOR_STREAMER_LIVE_FETCH = 36
const STREAMER_LIVES_CONCURRENCY = 6

type StreamerGameLogRow = {
  game_id: number
  log_date: string
  streamer_name: string
  peak_viewers: number
  channel_image_url: string | null
}

async function collectStreamerGameLogRowsFromChzzk(
  statsMap: Map<number, GameStatsWithCategory>,
): Promise<{ rows: StreamerGameLogRow[]; gamesFetched: number }> {
  const kstLogDate = getKstTodayDateString()
  const entries = Array.from(statsMap.entries())
    .filter(([, s]) => s.chzzkCategoryId.length > 0)
    .sort((a, b) => b[1].concurrentUserCount - a[1].concurrentUserCount)
    .slice(0, MAX_GAMES_FOR_STREAMER_LIVE_FETCH)

  const rawRows: StreamerGameLogRow[] = []

  for (let i = 0; i < entries.length; i += STREAMER_LIVES_CONCURRENCY) {
    const chunk = entries.slice(i, i + STREAMER_LIVES_CONCURRENCY)
    const chunkResults = await Promise.all(
      chunk.map(async ([gameId, s]) => {
        const streams = await getChzzkStreamsByCategory(s.chzzkCategoryId, {
          bypassNextFetchCache: true,
        })
        return streams.map((st) => {
          const thumb =
            st.liveImageUrl?.includes("{type}") === true
              ? st.liveImageUrl.replace(/{type}/g, "200")
              : st.liveImageUrl?.trim() || ""
          const profile = st.channelImageUrl?.trim() || thumb || null
          return {
            game_id: gameId,
            log_date: kstLogDate,
            streamer_name: normalizeStreamerName(st.channelName),
            peak_viewers: st.concurrentUserCount,
            channel_image_url: profile,
          }
        })
      }),
    )
    for (const rows of chunkResults) {
      rawRows.push(...rows)
    }
  }

  const deduped = new Map<string, StreamerGameLogRow>()
  for (const row of rawRows) {
    if (!row.streamer_name) continue
    const key = `${row.game_id}\0${row.streamer_name}`
    const prev = deduped.get(key)
    if (!prev || row.peak_viewers > prev.peak_viewers) {
      deduped.set(key, row)
    } else if (prev && row.peak_viewers === prev.peak_viewers) {
      const url = row.channel_image_url?.trim() || prev.channel_image_url?.trim() || null
      deduped.set(key, { ...prev, channel_image_url: url })
    }
  }
  return { rows: Array.from(deduped.values()), gamesFetched: entries.length }
}

/**
 * 기존 DB peak_viewers와 비교해 더 큰 값으로 upsert (동일 키는 유니크 충돌 시 덮어쓰기 = 이미 max 반영된 값)
 */
async function mergeAndUpsertStreamerGameLogs(
  supabase: ReturnType<typeof createAdminClient>,
  rows: StreamerGameLogRow[],
): Promise<{ upserted: number; failed: number }> {
  if (rows.length === 0) return { upserted: 0, failed: 0 }

  const kstLogDate = rows[0]!.log_date
  const gameIds = [...new Set(rows.map((r) => r.game_id))]

  let existing: unknown[] | null = null
  let selectHasChannelImage = true
  {
    const withImg = await supabase
      .from("streamer_game_logs")
      .select("game_id, streamer_name, peak_viewers, channel_image_url")
      .eq("log_date", kstLogDate)
      .in("game_id", gameIds)

    if (withImg.error && isMissingOrUnknownColumnError(withImg.error.message)) {
      const noImg = await supabase
        .from("streamer_game_logs")
        .select("game_id, streamer_name, peak_viewers")
        .eq("log_date", kstLogDate)
        .in("game_id", gameIds)
      if (noImg.error) {
        throw new Error(noImg.error.message)
      }
      existing = noImg.data ?? []
      selectHasChannelImage = false
    } else if (withImg.error) {
      throw new Error(withImg.error.message)
    } else {
      existing = withImg.data ?? []
    }
  }

  const existingByKey = new Map<string, { peak: number; image: string | null }>()
  for (const ex of existing ?? []) {
    const r = ex as {
      game_id: number
      streamer_name: string
      peak_viewers: number | null
      channel_image_url?: string | null
      channelImageUrl?: string | null
    }
    const name = normalizeStreamerName(String(r.streamer_name ?? ""))
    if (!name) continue
    const key = `${r.game_id}\0${name}`
    const img = selectHasChannelImage ? r.channel_image_url ?? r.channelImageUrl : null
    existingByKey.set(key, {
      peak: Number(r.peak_viewers ?? 0),
      image: typeof img === "string" ? img.trim() || null : null,
    })
  }

  const merged: StreamerGameLogRow[] = rows.map((row) => {
    const key = `${row.game_id}\0${row.streamer_name}`
    const prev = existingByKey.get(key)
    const prevPeak = prev?.peak ?? 0
    const prevImage = selectHasChannelImage ? prev?.image ?? null : null
    const newPeak = row.peak_viewers
    const finalPeak = Math.max(newPeak, prevPeak)
    let finalImage: string | null = null
    if (selectHasChannelImage) {
      if (newPeak > prevPeak) {
        finalImage = row.channel_image_url?.trim() || prevImage
      } else if (newPeak < prevPeak) {
        finalImage = prevImage || row.channel_image_url?.trim() || null
      } else {
        finalImage = row.channel_image_url?.trim() || prevImage || null
      }
    }
    return { ...row, peak_viewers: finalPeak, channel_image_url: finalImage }
  })

  const toUpsert = selectHasChannelImage
    ? merged
    : merged.map(({ channel_image_url: _omit, ...rest }) => rest)

  const BATCH = 200
  let upserted = 0
  let failed = 0
  for (let i = 0; i < toUpsert.length; i += BATCH) {
    const batch = toUpsert.slice(i, i + BATCH)
    let { error } = await supabase.from("streamer_game_logs").upsert(batch, {
      onConflict: "game_id,log_date,streamer_name",
      ignoreDuplicates: false,
    })
    if (error && selectHasChannelImage && isMissingOrUnknownColumnError(error.message)) {
      const stripped = batch.map((row: Record<string, unknown>) => {
        const { channel_image_url: _c, ...rest } = row
        return rest
      })
      const retry = await supabase.from("streamer_game_logs").upsert(stripped, {
        onConflict: "game_id,log_date,streamer_name",
        ignoreDuplicates: false,
      })
      error = retry.error
    }
    if (error) {
      console.error("[DailyStats] streamer_game_logs upsert:", error.message, error.details, error.hint)
      failed += batch.length
    } else {
      upserted += batch.length
    }
  }
  return { upserted, failed }
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
  // Auth: CRON_SECRET below — not browser session getUser().
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

    // ── Step 3: Chzzk 카테고리를 game_id에 매핑 + 집계 (시청자 최고 행의 categoryId 보존 → 라이브 목록 API용) ──
    const statsMap = new Map<number, GameStatsWithCategory>()

    for (const cat of categories) {
      const gameId =
        koreanMap.get(normalize(cat.categoryValue)) ??
        englishMap.get(normalize(cat.categoryId)) ??
        titleMap.get(normalize(cat.categoryValue)) ??
        titleMap.get(normalize(cat.categoryId))

      if (!gameId) continue

      const chzzkCategoryId = String(cat.categoryId ?? "").trim()
      const prev = statsMap.get(gameId)
      // 중복 매핑 시 더 높은 값 유지
      if (!prev || cat.concurrentUserCount > prev.concurrentUserCount) {
        statsMap.set(gameId, {
          concurrentUserCount: cat.concurrentUserCount,
          openLiveCount: cat.openLiveCount,
          chzzkCategoryId,
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

    // ── Step 8: streamer_game_logs (KST 당일, 카테고리별 라이브 순회 → 채널명·시청자 피크 병합 upsert) ──
    let streamerLogs: {
      kstLogDate: string
      gamesFetched: number
      rawRows: number
      upserted: number
      failed: number
      skipped: boolean
      error?: string
    } = {
      kstLogDate: getKstTodayDateString(),
      gamesFetched: 0,
      rawRows: 0,
      upserted: 0,
      failed: 0,
      skipped: true,
    }

    try {
      const { rows: logRows, gamesFetched } = await collectStreamerGameLogRowsFromChzzk(statsMap)
      streamerLogs.gamesFetched = gamesFetched
      streamerLogs.rawRows = logRows.length
      streamerLogs.skipped = false
      if (logRows.length > 0) {
        const { upserted: slUp, failed: slFail } = await mergeAndUpsertStreamerGameLogs(supabase, logRows)
        streamerLogs.upserted = slUp
        streamerLogs.failed = slFail
      }
      console.log(
        `[DailyStats] streamer_game_logs — kst: ${streamerLogs.kstLogDate}, games: ${gamesFetched}, rows: ${logRows.length}, upserted: ${streamerLogs.upserted}, failed: ${streamerLogs.failed}`,
      )
    } catch (e) {
      streamerLogs.error = e instanceof Error ? e.message : String(e)
      console.error("[DailyStats] streamer_game_logs pipeline failed:", streamerLogs.error)
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
      streamerLogs,
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
  } finally {
    logCronAgainstHobbyTarget("update-daily-stats", startTime)
  }
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
