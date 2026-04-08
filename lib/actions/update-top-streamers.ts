import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/server"
import { isMissingOrUnknownColumnError } from "@/lib/supabase/column-error"

/** KST 기준 오늘 날짜 YYYY-MM-DD */
export function getKstTodayDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" })
}

/**
 * KST 기준 어제 날짜 YYYY-MM-DD
 * (이전 UTC Date.UTC(y,m,d) 방식은 KST 달력과 어긋날 수 있어, KST 정오 앵커로 하루 전으로 계산)
 */
export function getKstYesterdayDateString(): string {
  const today = getKstTodayDateString()
  const anchor = new Date(`${today}T12:00:00+09:00`)
  anchor.setUTCDate(anchor.getUTCDate() - 1)
  return anchor.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" })
}

export interface StreamerRankRow {
  streamer_name: string
  peak_viewers: number
  channel_image_url: string | null
}

export interface GameTopStreamersRow {
  game_id: number
  rank1_name: string | null
  rank1_viewers: number | null
  rank1_profile_image_url: string | null
  rank2_name: string | null
  rank2_viewers: number | null
  rank2_profile_image_url: string | null
  rank3_name: string | null
  rank3_viewers: number | null
  rank3_profile_image_url: string | null
  last_updated: string | null
}

export function normalizeStreamerName(name: string): string {
  return name.trim()
}

/**
 * 어제(KST) 로그와 기존 game_top_streamers를 병합해 TOP 3를 갱신합니다.
 */
export async function updateTopStreamers(
  gameId: number,
  supabase?: SupabaseClient,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = supabase ?? createAdminClient()
  const yesterday = getKstYesterdayDateString()

  let logRows: unknown[] | null = null
  let logHasImageColumn = true
  {
    const withImg = await client
      .from("streamer_game_logs")
      .select("streamer_name, peak_viewers, channel_image_url")
      .eq("game_id", gameId)
      .eq("log_date", yesterday)
      .order("peak_viewers", { ascending: false })

    if (withImg.error && isMissingOrUnknownColumnError(withImg.error.message)) {
      const noImg = await client
        .from("streamer_game_logs")
        .select("streamer_name, peak_viewers")
        .eq("game_id", gameId)
        .eq("log_date", yesterday)
        .order("peak_viewers", { ascending: false })
      if (noImg.error) {
        return { ok: false, error: noImg.error.message }
      }
      logRows = noImg.data ?? []
      logHasImageColumn = false
    } else if (withImg.error) {
      return { ok: false, error: withImg.error.message }
    } else {
      logRows = withImg.data ?? []
    }
  }

  const yesterdayList: StreamerRankRow[] = (logRows ?? [])
    .map((r) => {
      const row = r as {
        streamer_name?: string | null
        peak_viewers?: number | null
        channel_image_url?: string | null
      }
      return {
        streamer_name: normalizeStreamerName(String(row.streamer_name ?? "")),
        peak_viewers: Number(row.peak_viewers ?? 0),
        channel_image_url: logHasImageColumn ? row.channel_image_url?.trim() || null : null,
      }
    })
    .filter((r) => r.streamer_name.length > 0)

  let currentRow: GameTopStreamersRow | null = null
  let topHasProfileColumns = true
  {
    const full = await client
      .from("game_top_streamers")
      .select(
        "game_id, rank1_name, rank1_viewers, rank1_profile_image_url, rank2_name, rank2_viewers, rank2_profile_image_url, rank3_name, rank3_viewers, rank3_profile_image_url, last_updated",
      )
      .eq("game_id", gameId)
      .maybeSingle()

    if (full.error && isMissingOrUnknownColumnError(full.error.message)) {
      const slim = await client
        .from("game_top_streamers")
        .select("game_id, rank1_name, rank1_viewers, rank2_name, rank2_viewers, rank3_name, rank3_viewers, last_updated")
        .eq("game_id", gameId)
        .maybeSingle()
      if (slim.error) {
        return { ok: false, error: slim.error.message }
      }
      currentRow = slim.data as GameTopStreamersRow | null
      topHasProfileColumns = false
    } else if (full.error) {
      return { ok: false, error: full.error.message }
    } else {
      currentRow = full.data as GameTopStreamersRow | null
    }
  }

  const currentData = currentRow

  const finalTop3: StreamerRankRow[] = [...yesterdayList]

  if (finalTop3.length < 3 && currentData) {
    const currentSlots: StreamerRankRow[] = [
      {
        streamer_name: currentData.rank1_name ? normalizeStreamerName(currentData.rank1_name) : "",
        peak_viewers: Number(currentData.rank1_viewers ?? 0),
        channel_image_url:
          topHasProfileColumns && currentData.rank1_profile_image_url
            ? currentData.rank1_profile_image_url.trim() || null
            : null,
      },
      {
        streamer_name: currentData.rank2_name ? normalizeStreamerName(currentData.rank2_name) : "",
        peak_viewers: Number(currentData.rank2_viewers ?? 0),
        channel_image_url:
          topHasProfileColumns && currentData.rank2_profile_image_url
            ? currentData.rank2_profile_image_url.trim() || null
            : null,
      },
      {
        streamer_name: currentData.rank3_name ? normalizeStreamerName(currentData.rank3_name) : "",
        peak_viewers: Number(currentData.rank3_viewers ?? 0),
        channel_image_url:
          topHasProfileColumns && currentData.rank3_profile_image_url
            ? currentData.rank3_profile_image_url.trim() || null
            : null,
      },
    ].filter((s) => s.streamer_name.length > 0)

    const names = new Set(finalTop3.map((s) => s.streamer_name))
    for (const slot of currentSlots) {
      if (finalTop3.length >= 3) break
      if (!names.has(slot.streamer_name)) {
        finalTop3.push({ ...slot })
        names.add(slot.streamer_name)
      }
    }
  }

  const top3 = finalTop3.slice(0, 3)
  const basePayload = {
    game_id: gameId,
    rank1_name: top3[0]?.streamer_name ?? null,
    rank1_viewers: top3[0]?.peak_viewers ?? null,
    rank2_name: top3[1]?.streamer_name ?? null,
    rank2_viewers: top3[1]?.peak_viewers ?? null,
    rank3_name: top3[2]?.streamer_name ?? null,
    rank3_viewers: top3[2]?.peak_viewers ?? null,
    last_updated: new Date().toISOString(),
  }
  const profilePayload = topHasProfileColumns
    ? {
        rank1_profile_image_url: top3[0]?.channel_image_url?.trim() || null,
        rank2_profile_image_url: top3[1]?.channel_image_url?.trim() || null,
        rank3_profile_image_url: top3[2]?.channel_image_url?.trim() || null,
      }
    : {}

  let upsertError = (
    await client.from("game_top_streamers").upsert({ ...basePayload, ...profilePayload }, {
      onConflict: "game_id",
      ignoreDuplicates: false,
    })
  ).error

  if (upsertError && topHasProfileColumns && isMissingOrUnknownColumnError(upsertError.message)) {
    upsertError = (
      await client.from("game_top_streamers").upsert(basePayload, {
        onConflict: "game_id",
        ignoreDuplicates: false,
      })
    ).error
  }

  if (upsertError) {
    return { ok: false, error: upsertError.message }
  }

  return { ok: true }
}

/** 로그 또는 기존 TOP3 캐시가 있는 모든 game_id */
export async function fetchGameIdsForTopStreamerUpdate(
  supabase?: SupabaseClient,
): Promise<number[]> {
  const client = supabase ?? createAdminClient()
  const ids = new Set<number>()
  const pageSize = 1000

  for (let start = 0; ; start += pageSize) {
    const { data: logGames, error: e1 } = await client
      .from("streamer_game_logs")
      .select("game_id")
      .order("game_id", { ascending: true })
      .order("id", { ascending: true })
      .range(start, start + pageSize - 1)
    if (e1) {
      console.error("[fetchGameIdsForTopStreamerUpdate] streamer_game_logs:", e1.message)
      break
    }
    const chunk = logGames ?? []
    for (const row of chunk) {
      const id = Number((row as { game_id: number }).game_id)
      if (Number.isFinite(id)) ids.add(id)
    }
    if (chunk.length < pageSize) break
  }

  for (let start = 0; ; start += pageSize) {
    const { data: topGames, error: e2 } = await client
      .from("game_top_streamers")
      .select("game_id")
      .order("game_id", { ascending: true })
      .range(start, start + pageSize - 1)
    if (e2) {
      console.error("[fetchGameIdsForTopStreamerUpdate] game_top_streamers:", e2.message)
      break
    }
    const chunk = topGames ?? []
    for (const row of chunk) {
      const id = Number((row as { game_id: number }).game_id)
      if (Number.isFinite(id)) ids.add(id)
    }
    if (chunk.length < pageSize) break
  }

  return Array.from(ids).sort((a, b) => a - b)
}

const PARALLEL = 15

/**
 * 활성(로그 또는 캐시에 등장한) 게임마다 updateTopStreamers 실행.
 */
export async function updateTopStreamersForAllGames(): Promise<{
  gameCount: number
  updated: number
  failed: number
  errors: string[]
}> {
  const supabase = createAdminClient()
  const gameIds = await fetchGameIdsForTopStreamerUpdate(supabase)
  let updated = 0
  let failed = 0
  const errors: string[] = []

  for (let i = 0; i < gameIds.length; i += PARALLEL) {
    const chunk = gameIds.slice(i, i + PARALLEL)
    const results = await Promise.all(chunk.map((id) => updateTopStreamers(id, supabase)))
    for (let j = 0; j < results.length; j++) {
      const r = results[j]
      if (r.ok) updated++
      else {
        failed++
        errors.push(`game_id ${chunk[j]}: ${r.error}`)
      }
    }
  }

  return { gameCount: gameIds.length, updated, failed, errors }
}
