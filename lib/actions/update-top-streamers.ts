import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/server"
import { addKstCalendarDays, formatKstDateString } from "@/lib/kst-dates"
import { delay, normalizeChzzkStreamerNameForMatch } from "@/lib/utils"
import { isPostgrestMissingColumnError, isPostgrestRpcNotFoundError } from "@/lib/postgrest-utils"
import { getChzzkStreamsByCategory } from "@/lib/chzzk"

/** KST 기준 오늘 날짜 YYYY-MM-DD */
export function getKstTodayDateString(): string {
  return formatKstDateString()
}

/** KST 기준 어제 날짜 YYYY-MM-DD */
export function getKstYesterdayDateString(): string {
  return addKstCalendarDays(formatKstDateString(), -1)
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

/** DB 로그에 프로필 URL이 없을 때 라이브 목록으로 보강(방송 중·닉 일치 시에만) */
async function enrichTop3ProfileUrlsFromChzzkLive(
  gameId: number,
  client: SupabaseClient,
  rows: StreamerRankRow[],
): Promise<StreamerRankRow[]> {
  const needUrl = rows.some((r) => r.streamer_name && !r.channel_image_url?.trim())
  if (!needUrl) return rows

  const { data: g, error: gErr } = await client
    .from("games")
    .select("english_title")
    .eq("id", gameId)
    .maybeSingle()
  if (gErr || !g) return rows

  const slug = String((g as { english_title?: string | null }).english_title ?? "").trim()
  if (!slug) return rows

  let streams: Awaited<ReturnType<typeof getChzzkStreamsByCategory>> = []
  try {
    streams = await getChzzkStreamsByCategory(slug, { bypassNextFetchCache: true })
  } catch {
    return rows
  }
  if (streams.length === 0) return rows

  return rows.map((r) => {
    if (!r.streamer_name?.trim() || r.channel_image_url?.trim()) return r
    const live = streams.find(
      (st) =>
        normalizeChzzkStreamerNameForMatch(st.channelName) ===
        normalizeChzzkStreamerNameForMatch(r.streamer_name),
    )
    const url = live?.channelImageUrl?.trim() || null
    return url ? { ...r, channel_image_url: url } : r
  })
}

function parseRpcGameIdRows(data: unknown): number[] {
  if (!Array.isArray(data)) return []
  const out: number[] = []
  for (const item of data) {
    if (item == null) continue
    if (typeof item === "number" && Number.isFinite(item)) {
      out.push(item)
      continue
    }
    if (typeof item === "object" && "game_id" in item) {
      const v = (item as { game_id: unknown }).game_id
      const n = typeof v === "string" ? Number(v) : Number(v)
      if (Number.isFinite(n)) out.push(n)
    }
  }
  return out
}

/** 어제(KST) streamer_game_logs + 기존 TOP3 병합 후 upsert */
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

  let top3: StreamerRankRow[] = finalTop3.slice(0, 3)
  top3 = await enrichTop3ProfileUrlsFromChzzkLive(gameId, client, top3)

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

/** RPC `fetch_game_ids_for_top_streamer_update` 우선, 실패 시 키셋 스캔 */
export async function fetchGameIdsForTopStreamerUpdate(
  supabase?: SupabaseClient,
): Promise<number[]> {
  const client = supabase ?? createAdminClient()

  const { data: rpcData, error: rpcError } = await client.rpc(
    "fetch_game_ids_for_top_streamer_update",
    {},
  )

  if (!rpcError && Array.isArray(rpcData)) {
    const ids = parseRpcGameIdRows(rpcData)
    return [...new Set(ids)].sort((a, b) => a - b)
  }

  if (rpcError && !isPostgrestRpcNotFoundError(rpcError.message)) {
    console.error("[fetchGameIdsForTopStreamerUpdate] RPC error:", rpcError.message)
  }

  return fetchGameIdsKeysetScan(client)
}

/** 폴백 키셋 스캔 최대 페이지 수 (무한 루프·장시간 크론 방지; 약 pageSize * maxPages 행 상한) */
const KEYSET_SCAN_MAX_PAGES = 150

async function fetchGameIdsKeysetScan(client: SupabaseClient): Promise<number[]> {
  const ids = new Set<number>()
  const pageSize = 2000
  let lastId = 0
  let pages = 0

  for (;;) {
    pages++
    if (pages > KEYSET_SCAN_MAX_PAGES) {
      console.warn(
        `[fetchGameIdsForTopStreamerUpdate] keyset scan stopped at ${KEYSET_SCAN_MAX_PAGES} pages (~${KEYSET_SCAN_MAX_PAGES * pageSize} rows); apply migration 003 RPC for full coverage`,
      )
      break
    }

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

/** 동시 치지직/DB 부하 완화 (Hobby·레이트 리밋 대비) */
const PARALLEL = 6

/** 배치 간 치지직 피크 완화 (ms) */
const BATCH_GAP_MS = 750

export type TopStreamersCronPartition = {
  part?: number
  parts?: number
}

/** `parts`>1이면 game_id 목록을 균등 분할(타임아웃 시 `?part=&parts=`로 분할 호출) */
export async function updateTopStreamersForAllGames(
  options?: TopStreamersCronPartition,
): Promise<{
  gameCount: number
  subsetCount: number
  part: number
  parts: number
  updated: number
  failed: number
  errors: string[]
}> {
  const supabase = createAdminClient()
  const parts = Math.min(24, Math.max(1, Math.floor(options?.parts ?? 1)))
  const part = Math.min(parts - 1, Math.max(0, Math.floor(options?.part ?? 0)))

  const allIds = await fetchGameIdsForTopStreamerUpdate(supabase)
  const per = Math.ceil(allIds.length / parts)
  const start = part * per
  const gameIds = allIds.slice(start, Math.min(start + per, allIds.length))

  let updated = 0
  let failed = 0
  const errors: string[] = []

  for (let i = 0; i < gameIds.length; i += PARALLEL) {
    const batch = gameIds.slice(i, i + PARALLEL)
    const settled = await Promise.allSettled(batch.map((id) => updateTopStreamers(id, supabase)))
    for (let j = 0; j < settled.length; j++) {
      const gid = batch[j]!
      const res = settled[j]!
      if (res.status === "fulfilled") {
        const r = res.value
        if (r.ok) updated++
        else {
          failed++
          errors.push(`game_id ${gid}: ${r.error}`)
        }
      } else {
        failed++
        const reason = res.reason instanceof Error ? res.reason.message : String(res.reason)
        errors.push(`game_id ${gid}: ${reason}`)
      }
    }
    if (i + PARALLEL < gameIds.length) {
      await delay(BATCH_GAP_MS)
    }
  }

  return {
    gameCount: allIds.length,
    subsetCount: gameIds.length,
    part,
    parts,
    updated,
    failed,
    errors,
  }
}
