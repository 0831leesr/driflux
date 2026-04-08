import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/server"
import { isPostgrestMissingColumnError, isPostgrestRpcNotFoundError } from "@/lib/postgrest-utils"

/** KST 기준 오늘 날짜 YYYY-MM-DD */
export function getKstTodayDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" })
}

/** KST 기준 어제 날짜 YYYY-MM-DD */
export function getKstYesterdayDateString(): string {
  const todayKst = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" })
  const [yStr, mStr, dStr] = todayKst.split("-")
  const y = Number(yStr)
  const m = Number(mStr)
  const d = Number(dStr)
  const utc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
  utc.setUTCDate(utc.getUTCDate() - 1)
  const yy = utc.getUTCFullYear()
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(utc.getUTCDate()).padStart(2, "0")
  return `${yy}-${mm}-${dd}`
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
  {
    const resFull = await client
      .from("streamer_game_logs")
      .select("streamer_name, peak_viewers, channel_image_url")
      .eq("game_id", gameId)
      .eq("log_date", yesterday)
      .order("peak_viewers", { ascending: false })
    if (resFull.error && isPostgrestMissingColumnError(resFull.error.message)) {
      const resSlim = await client
        .from("streamer_game_logs")
        .select("streamer_name, peak_viewers")
        .eq("game_id", gameId)
        .eq("log_date", yesterday)
        .order("peak_viewers", { ascending: false })
      if (resSlim.error) {
        return { ok: false, error: resSlim.error.message }
      }
      logRows = resSlim.data ?? []
    } else if (resFull.error) {
      return { ok: false, error: resFull.error.message }
    } else {
      logRows = resFull.data ?? []
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
        channel_image_url: row.channel_image_url?.trim() || null,
      }
    })
    .filter((r) => r.streamer_name.length > 0)

  let currentRow: unknown = null
  {
    const resFull = await client
      .from("game_top_streamers")
      .select(
        "game_id, rank1_name, rank1_viewers, rank1_profile_image_url, rank2_name, rank2_viewers, rank2_profile_image_url, rank3_name, rank3_viewers, rank3_profile_image_url, last_updated",
      )
      .eq("game_id", gameId)
      .maybeSingle()
    if (resFull.error && isPostgrestMissingColumnError(resFull.error.message)) {
      const resSlim = await client
        .from("game_top_streamers")
        .select("game_id, rank1_name, rank1_viewers, rank2_name, rank2_viewers, rank3_name, rank3_viewers, last_updated")
        .eq("game_id", gameId)
        .maybeSingle()
      if (resSlim.error) {
        return { ok: false, error: resSlim.error.message }
      }
      currentRow = resSlim.data
    } else if (resFull.error) {
      return { ok: false, error: resFull.error.message }
    } else {
      currentRow = resFull.data
    }
  }

  const currentData = currentRow as GameTopStreamersRow | null

  const finalTop3: StreamerRankRow[] = [...yesterdayList]

  if (finalTop3.length < 3 && currentData) {
    const currentSlots: StreamerRankRow[] = [
      {
        streamer_name: currentData.rank1_name ? normalizeStreamerName(currentData.rank1_name) : "",
        peak_viewers: Number(currentData.rank1_viewers ?? 0),
        channel_image_url: currentData.rank1_profile_image_url?.trim() || null,
      },
      {
        streamer_name: currentData.rank2_name ? normalizeStreamerName(currentData.rank2_name) : "",
        peak_viewers: Number(currentData.rank2_viewers ?? 0),
        channel_image_url: currentData.rank2_profile_image_url?.trim() || null,
      },
      {
        streamer_name: currentData.rank3_name ? normalizeStreamerName(currentData.rank3_name) : "",
        peak_viewers: Number(currentData.rank3_viewers ?? 0),
        channel_image_url: currentData.rank3_profile_image_url?.trim() || null,
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
  const payload = {
    game_id: gameId,
    rank1_name: top3[0]?.streamer_name ?? null,
    rank1_viewers: top3[0]?.peak_viewers ?? null,
    rank1_profile_image_url: top3[0]?.channel_image_url?.trim() || null,
    rank2_name: top3[1]?.streamer_name ?? null,
    rank2_viewers: top3[1]?.peak_viewers ?? null,
    rank2_profile_image_url: top3[1]?.channel_image_url?.trim() || null,
    rank3_name: top3[2]?.streamer_name ?? null,
    rank3_viewers: top3[2]?.peak_viewers ?? null,
    rank3_profile_image_url: top3[2]?.channel_image_url?.trim() || null,
    last_updated: new Date().toISOString(),
  }

  let upsertRes = await client.from("game_top_streamers").upsert(payload, {
    onConflict: "game_id",
    ignoreDuplicates: false,
  })

  if (upsertRes.error && isPostgrestMissingColumnError(upsertRes.error.message)) {
    upsertRes = await client
      .from("game_top_streamers")
      .upsert(
        {
          game_id: payload.game_id,
          rank1_name: payload.rank1_name,
          rank1_viewers: payload.rank1_viewers,
          rank2_name: payload.rank2_name,
          rank2_viewers: payload.rank2_viewers,
          rank3_name: payload.rank3_name,
          rank3_viewers: payload.rank3_viewers,
          last_updated: payload.last_updated,
        },
        { onConflict: "game_id", ignoreDuplicates: false },
      )
  }

  if (upsertRes.error) {
    return { ok: false, error: upsertRes.error.message }
  }

  return { ok: true }
}

/**
 * 로그 또는 TOP3 캐시에 등장한 모든 game_id.
 * 이전 구현은 streamer_game_logs 전 행의 game_id를 한 번에 select 해 페이로드·타임아웃 위험이 있었음 → RPC DISTINCT 또는 id 키셋 스캔.
 */
export async function fetchGameIdsForTopStreamerUpdate(
  supabase?: SupabaseClient,
): Promise<number[]> {
  const client = supabase ?? createAdminClient()

  const { data: rpcData, error: rpcError } = await client.rpc("fetch_game_ids_for_top_streamer_update")
  if (!rpcError && Array.isArray(rpcData)) {
    return (rpcData as { game_id: number }[])
      .map((r) => Number(r.game_id))
      .filter((id) => Number.isFinite(id))
  }

  if (rpcError && !isPostgrestRpcNotFoundError(rpcError.message)) {
    console.error("[fetchGameIdsForTopStreamerUpdate] RPC error:", rpcError.message)
  }

  return fetchGameIdsKeysetScan(client)
}

async function fetchGameIdsKeysetScan(client: SupabaseClient): Promise<number[]> {
  const ids = new Set<number>()
  const pageSize = 2000
  let lastId = 0

  for (;;) {
    const { data, error } = await client
      .from("streamer_game_logs")
      .select("id, game_id")
      .gt("id", lastId)
      .order("id", { ascending: true })
      .limit(pageSize)

    if (error) {
      console.error("[fetchGameIdsForTopStreamerUpdate] keyset streamer_game_logs:", error.message)
      break
    }

    const rows = (data ?? []) as { id: number; game_id: number }[]
    if (rows.length === 0) break

    for (const r of rows) {
      const gid = Number(r.game_id)
      if (Number.isFinite(gid)) ids.add(gid)
      lastId = r.id
    }
    if (rows.length < pageSize) break
  }

  const { data: topRows, error: topErr } = await client.from("game_top_streamers").select("game_id")
  if (!topErr) {
    for (const row of topRows ?? []) {
      const id = Number((row as { game_id: number }).game_id)
      if (Number.isFinite(id)) ids.add(id)
    }
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
