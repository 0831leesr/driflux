import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { getSteamGameDetails, processSteamData, findSteamAppIdWithConfidence, getSteamReviewSummary } from "@/lib/steam"
import { getGameMappings, normalizeChzzkMappingKey, resolveMapping, type GameMapping } from "@/lib/mappings"
import { delay } from "@/lib/utils"
import { searchIGDBGame, fetchSteamAppIdFromIGDB, fetchEarliestReleaseDateFromIGDB } from "@/lib/igdb"
import { fetchChzzkGamePosterImage } from "@/lib/chzzk"
import { TAG_TRANSLATIONS } from "@/lib/constants"
import { logCronAgainstHobbyTarget } from "@/lib/cron-hobby-log"

/** Steam API에서 "not found" 반환하는 알려진 잘못된 app ID (스킵하여 API 호출 절약) */
const STEAM_SKIP_APP_IDS = new Set([238960, 212200, 495910, 1599340])

/** Vercel serverless timeout: 300초 (cron 제한) */
export const maxDuration = 300

const FORCE_UPDATE_LIMIT = 10
const GAME_SELECT =
  "id, title, korean_title, english_title, slug, steam_appid, header_image_url, discount_rate, last_data_update, game_data_update"

type SteamUpdateGame = {
  id: number
  title: string
  korean_title?: string | null
  english_title?: string | null
  slug?: string | null
  steam_appid: number | null
  header_image_url?: string | null
  discount_rate?: number | null
  last_data_update?: string | null
  game_data_update?: string | null
}

type QueuedSteamUpdateGame = SteamUpdateGame & {
  forceUpdateMappingTitle?: string
}

type SupabaseQueryError = { message: string } | null
type SelectQueryResult<T> = { data: T[] | null; error: SupabaseQueryError }
type SelectQuery<T> = {
  eq(column: string, value: string | number): SelectQuery<T>
  in(column: string, values: string[]): SelectQuery<T>
  limit(count: number): PromiseLike<SelectQueryResult<T>>
}
type MutationQuery = {
  eq(column: string, value: string | number | boolean): MutationQuery & PromiseLike<{ error: SupabaseQueryError }>
}
type AdminSupabaseClient = {
  from(table: "games"): { select(columns: string): SelectQuery<SteamUpdateGame> }
  from(table: "game_mappings"): { update(values: Record<string, string | boolean>): MutationQuery }
  from(table: "game_tags"): { delete(): MutationQuery }
}

function uniqueMappings(mappings: Record<string, GameMapping>): GameMapping[] {
  return Array.from(
    new Map(Object.values(mappings).map((mapping) => [mapping.chzzk_title, mapping])).values(),
  )
}

/** resolveMapping과 동일한 제목 후보(원문 + 공백 제거 키) — games 컬럼과의 정확 일치 조회용 */
function buildForceLookupTitles(mapping: GameMapping): string[] {
  const raw = [mapping.chzzk_title, mapping.steam_title, mapping.igdb_title]
  const out = new Set<string>()
  for (const t of raw) {
    const s = t?.trim()
    if (!s) continue
    out.add(s)
    const compact = normalizeChzzkMappingKey(s)
    if (compact) out.add(compact)
  }
  return [...out]
}

async function fetchForceUpdateGames(
  adminSupabase: AdminSupabaseClient,
  forceMappings: GameMapping[],
  allMappings: Record<string, GameMapping>,
): Promise<QueuedSteamUpdateGame[]> {
  const queued = new Map<number, QueuedSteamUpdateGame>()

  for (const mapping of forceMappings) {
    const titles = buildForceLookupTitles(mapping)

    const considerRow = (row: SteamUpdateGame, match: "steam_appid" | "title") => {
      if (match === "steam_appid") {
        if (mapping.steam_appid == null) return
        if (row.steam_appid !== mapping.steam_appid) return
      } else {
        const resolved = resolveMapping(allMappings, row.title?.trim() ?? "", row.english_title, row.korean_title)
        if (resolved?.chzzk_title !== mapping.chzzk_title) return
      }
      if (!queued.has(row.id)) {
        queued.set(row.id, {
          ...row,
          forceUpdateMappingTitle: mapping.chzzk_title,
        })
      }
    }

    if (mapping.steam_appid != null) {
      const { data, error } = await adminSupabase
        .from("games")
        .select(GAME_SELECT)
        .eq("steam_appid", mapping.steam_appid)
        .limit(10)
      if (error) {
        console.error(`[Steam Update] force_update steam_appid lookup failed (${mapping.chzzk_title}):`, error.message)
      } else {
        for (const row of (data as SteamUpdateGame[] | null) ?? []) {
          considerRow(row, "steam_appid")
        }
      }
    }

    if (titles.length > 0) {
      for (const column of ["title", "korean_title", "english_title"] as const) {
        const { data, error } = await adminSupabase
          .from("games")
          .select(GAME_SELECT)
          .in(column, titles)
          .limit(20)
        if (error) {
          console.error(`[Steam Update] force_update ${column} lookup failed (${mapping.chzzk_title}):`, error.message)
        } else {
          for (const row of (data as SteamUpdateGame[] | null) ?? []) {
            considerRow(row, "title")
          }
        }
      }
    }

    if (!Array.from(queued.values()).some((game) => game.forceUpdateMappingTitle === mapping.chzzk_title)) {
      console.warn(
        `[Steam Update] force_update: no game matched mapping "${mapping.chzzk_title}". ` +
          `Ensure games.title / korean_title / english_title 중 하나가 resolveMapping(↔chzzk_title)에 맞거나, ` +
          `games.steam_appid가 game_mappings.steam_appid과 일치합니다.`,
      )
    }
  }

  return Array.from(queued.values())
}

async function clearForceUpdateFlag(
  adminSupabase: AdminSupabaseClient,
  mappingTitle?: string,
) {
  if (!mappingTitle) return
  const { error } = await adminSupabase
    .from("game_mappings")
    .update({ force_update: false })
    .eq("chzzk_title", mappingTitle)
    .eq("force_update", true)

  if (error) {
    console.error(`[Steam Update] Failed to clear force_update for ${mappingTitle}:`, error.message)
  }
}

/**
 * Cron Job API: Update Steam Game Data
 * 
 * GET /api/cron/update-steam
 * 
 * This endpoint fetches latest data from Steam API and updates the database.
 * Should be called periodically (e.g., daily via Vercel Cron or manual trigger).
 * 
 * Optional Query Parameters:
 * - limit: Number of games to update (default: 50, cron용)
 * - appid: Update specific app only
 * 
 * Example:
 * GET /api/cron/update-steam
 * GET /api/cron/update-steam?limit=10
 * GET /api/cron/update-steam?appid=1245620
 */
export async function GET(request: Request) {
  // Auth: CRON_SECRET below — not browser session getUser().
  // Security: Verify cron secret (skip in development)
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
  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get("limit")
  const appIdParam = searchParams.get("appid")

  console.log("[Steam Update] Starting update job...")

  try {
    // Create admin client with Service Role Key (bypasses RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[Steam Update] Missing Supabase credentials")
      return NextResponse.json(
        { error: "Server configuration error: Missing Supabase credentials" },
        { status: 500 }
      )
    }

    // Admin client for write operations (bypasses RLS)
    const adminSupabase = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
    const forceUpdateSupabase = adminSupabase as unknown as AdminSupabaseClient

    // Regular client for read operations
    const supabase = await createClient()

    console.log("[Steam Update] ✓ Admin client initialized with Service Role Key")

    // 사전 로드: skip_steam & skip_igdb 필터링을 위해 mappings 먼저 조회
    const mappings = await getGameMappings()
    const uniqueMappingCount = new Set(Object.values(mappings).map((m) => m.chzzk_title)).size
    console.log(`[Steam Update] Loaded ${uniqueMappingCount} game mappings from DB`)

    const limit = limitParam ? parseInt(limitParam, 10) : 50
    const forceUpdateMappings = !appIdParam
      ? uniqueMappings(mappings).filter((mapping) => mapping.force_update).slice(0, FORCE_UPDATE_LIMIT)
      : []
    const forceUpdateGames = forceUpdateMappings.length > 0
      ? (await fetchForceUpdateGames(forceUpdateSupabase, forceUpdateMappings, mappings)).slice(0, limit)
      : []
    const forceUpdateGameIds = new Set(forceUpdateGames.map((game) => game.id))
    if (forceUpdateMappings.length > 0) {
      console.log(
        `[Steam Update] force_update mappings: ${forceUpdateMappings.length}, matched games: ${forceUpdateGames.length}`,
      )
    }

    // 갱신 대상 선정: force_update 게임 우선 → game_data_update 오래된 순 → last_data_update 오래된 순.
    // game_data_update=성공 시각, last_data_update=시도 시각. 일반 배치에서는 skip_steam&skip_igdb 모두 TRUE인 게임 제외.
    const regularLimit = Math.max(limit - forceUpdateGames.length, 0)
    const fetchLimit = Math.max(regularLimit + 30, 80) // 필터링 여유 확보

    let query = supabase
      .from("games")
      .select(GAME_SELECT)
      .order("game_data_update", { ascending: true, nullsFirst: true })
      .order("last_data_update", { ascending: true, nullsFirst: true })

    // Filter by specific app ID if provided (Steam games only)
    if (appIdParam) {
      const appId = parseInt(appIdParam, 10)
      if (isNaN(appId)) {
        return NextResponse.json(
          { error: "Invalid appid parameter" },
          { status: 400 }
        )
      }
      query = query.eq("steam_appid", appId)
      // appid 지정 시 limit만 적용 (필터링 생략)
    } else if (regularLimit > 0) {
      query = query.limit(fetchLimit)
    }

    const { data: rawGames, error: fetchError } = regularLimit > 0 || appIdParam
      ? await query
      : { data: [], error: null }

    if (fetchError) {
      console.error("[Steam Update] Database fetch error:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch games from database", details: fetchError.message },
        { status: 500 }
      )
    }

    // skip_steam & skip_igdb 모두 TRUE인 게임 제외 후 limit개 선정
    let regularGames = (rawGames ?? []) as QueuedSteamUpdateGame[]
    if (!appIdParam && regularGames.length > 0) {
      const filtered: QueuedSteamUpdateGame[] = []
      for (const g of regularGames) {
        if (forceUpdateGameIds.has(g.id)) continue
        const koreanTitle = (g as { korean_title?: string | null }).korean_title?.trim() || null
        const englishTitle = (g as { english_title?: string | null }).english_title?.trim() || null
        const fallbackTitle = g.title?.trim() || ""
        const mapping = resolveMapping(mappings, fallbackTitle, englishTitle, koreanTitle)
        if (mapping?.skip_steam && mapping?.skip_igdb) continue // 의도적 제외
        filtered.push(g)
        if (filtered.length >= regularLimit) break
      }
      regularGames = filtered
    } else if (appIdParam && regularGames.length > 1) {
      regularGames = regularGames.slice(0, 1) // appid 지정 시 1건만
    }
    const games: QueuedSteamUpdateGame[] = appIdParam ? regularGames : [...forceUpdateGames, ...regularGames]

    if (!games || games.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No games found",
        stats: {
          total: 0,
          updated: 0,
          failed: 0,
          skipped: 0,
          forceUpdateMappings: forceUpdateMappings.length,
          forceUpdateMatched: forceUpdateGames.length,
        },
        duration: Date.now() - startTime,
      })
    }

    console.log(`[Steam Update] Found ${games.length} games to update (game_data_update → last_data_update 오래된 순)`)

    const results = {
      total: games.length,
      updated: 0,
      failed: 0,
      skipped: 0,
      forceUpdateMappings: forceUpdateMappings.length,
      forceUpdateMatched: forceUpdateGames.length,
      details: [] as Array<{
        id: number
        title: string
        steam_appid: number | null
        status: "updated" | "failed" | "skipped"
        message?: string
      }>,
    }

    /* ── IGDB + Steam 하이브리드 검색 (DB 매핑 오버라이드 파이프라인) ── */
    for (const game of games) {
      console.log(`[Steam Update] Processing: ${game.title} (SteamID: ${game.steam_appid ?? "null"})`)

      try {
        const koreanTitle = (game as { korean_title?: string | null }).korean_title?.trim() || null
        const englishTitle = (game as { english_title?: string | null }).english_title?.trim() || null
        const fallbackTitle = game.title?.trim() || ""
        const mapping = resolveMapping(mappings, fallbackTitle, englishTitle, koreanTitle)

        let igdbData: Awaited<ReturnType<typeof searchIGDBGame>> = null
        let steamData: Awaited<ReturnType<typeof processSteamData>> | null = null
        let steamAppId: number | null = mapping?.steam_appid ?? game.steam_appid ?? null

        // skip_steam: Steam 검색/조회 완전 스킵 (non-Steam 게임)
        if (mapping?.skip_steam) {
          steamAppId = mapping.steam_appid
          console.log(`[Steam Update] ⊗ skip_steam: ${game.title} - Steam 건너뜀`)
        }

        // --- 1. IGDB 검색 (skip_igdb가 아니면) ---
        if (!mapping?.skip_igdb) {
          const igdbSearchTitle = mapping?.igdb_title ?? null
          const koreanForIGDB = igdbSearchTitle ?? (koreanTitle || (englishTitle ? null : fallbackTitle))
          const englishForIGDB = igdbSearchTitle ?? (englishTitle || fallbackTitle)
          igdbData = await searchIGDBGame(koreanForIGDB, englishForIGDB)
          await delay(600)
        }

        // --- 2. Steam 검색/조회 (skip_steam이 아니면) ---
        // 2-1. steam_appid 우선: mapping/game에 있으면 해당 ID로 직접 조회
        // 2-2. steam_appid가 NULL이면 steam_title로 이름 기반 검색
        let searchPriceFallback: { price_krw: number | null; original_price_krw: number | null; discount_rate: number; currency: string } | null = null
        let clearedBadSteamAppId = false
        if (!mapping?.skip_steam) {
          if (!steamAppId) {
            // 2a. steam_title로 이름 기반 Steam 검색 (steam_appid가 NULL일 때)
            const steamSearchTitle = mapping?.steam_title ?? null
            const titlesToTry = steamSearchTitle
              ? [steamSearchTitle]
              : [
                  fallbackTitle,
                  ...(englishTitle && englishTitle !== fallbackTitle ? [englishTitle] : []),
                  ...(igdbData?.title && igdbData.title !== fallbackTitle && igdbData.title !== englishTitle ? [igdbData.title] : []),
                ]
            for (const t of titlesToTry) {
              if (!t?.trim()) continue
              const matchResult = await findSteamAppIdWithConfidence(t, 80)
              if (matchResult) {
                steamAppId = matchResult.appId
                searchPriceFallback = matchResult.priceFromSearch ?? null
                console.log(`[Discovery] Found on Steam: ${matchResult.matchedName} (${steamAppId})`)
                break
              }
              await delay(300)
            }
            // 2b. IGDB external_games로 Steam App ID 조회 (이름 검색 실패 시)
            if (!steamAppId && igdbData?.igdb_game_id) {
              const appIdFromIGDB = await fetchSteamAppIdFromIGDB(igdbData.igdb_game_id)
              if (appIdFromIGDB != null) {
                steamAppId = appIdFromIGDB
                console.log(`[Discovery] Found on Steam via IGDB external_games: ${steamAppId}`)
              }
              await delay(300)
            }
            await delay(500)
          }
          if (steamAppId) {
            if (STEAM_SKIP_APP_IDS.has(steamAppId)) {
              console.log(`[Steam Update] ⊗ Skipping known invalid app: ${steamAppId} (will clear from DB)`)
              clearedBadSteamAppId = true
              steamAppId = null
            } else {
              const raw = await getSteamGameDetails(steamAppId, "kr")
              if (raw) steamData = processSteamData(raw)
              await delay(1500)
            }
          }
        }

        // --- 2.5. 스팀 리뷰 요약 (steamAppId 존재 시) ---
        let steamReviewSummary: Awaited<ReturnType<typeof getSteamReviewSummary>> = null
        if (steamAppId && !STEAM_SKIP_APP_IDS.has(steamAppId)) {
          steamReviewSummary = await getSteamReviewSummary(steamAppId)
          await delay(500)
        }

        const hasMappingOverrides = mapping && (
          mapping.override_cover_image || mapping.override_header_image || mapping.override_background_image ||
          mapping.override_price != null || mapping.override_is_free != null ||
          mapping.skip_steam // skip_steam: Steam 필드 초기화를 위해 업데이트 수행
        )
        if (!igdbData && !steamData && !hasMappingOverrides && !clearedBadSteamAppId) {
          // Steam/IGDB 실패 시 이미지만 Chzzk API 시도 (유일한 이미지 소스)
          let chzzkPosterOnly: string | null = null
          const slugsToTry = [
            (englishTitle || fallbackTitle)?.trim()?.replace(/\s+/g, "_"),
            (game as { slug?: string | null }).slug?.trim()?.replace(/-/g, "_"),
          ].filter((s): s is string => !!s?.length)
          for (const slug of [...new Set(slugsToTry)]) {
            chzzkPosterOnly = await fetchChzzkGamePosterImage(slug)
            if (chzzkPosterOnly) break
            await delay(300)
          }
          if (chzzkPosterOnly) {
            const now = new Date().toISOString()
            const { error: chzzkUpdateErr } = await adminSupabase
              .from("games")
              .update({
                cover_image_url: chzzkPosterOnly,
                header_image_url: chzzkPosterOnly,
                last_data_update: now,
                game_data_update: now,
              })
              .eq("id", game.id)
            if (!chzzkUpdateErr) {
              await clearForceUpdateFlag(forceUpdateSupabase, game.forceUpdateMappingTitle)
              console.log(`[Steam Update] Chzzk-only update for cover/header: ${game.title}`)
              results.updated++
              results.details.push({ id: game.id, title: game.title, steam_appid: game.steam_appid ?? null, status: "updated" })
            } else {
              console.error(`[Steam Update] Chzzk update failed for ${game.title}:`, chzzkUpdateErr.message)
              results.failed++
              results.details.push({ id: game.id, title: game.title, steam_appid: game.steam_appid ?? null, status: "failed", message: chzzkUpdateErr.message })
            }
          } else {
            console.log(`[Discovery] Failed to find data for: ${game.title}`)
            await adminSupabase
              .from("games")
              .update({ last_data_update: new Date().toISOString() })
              .eq("id", game.id)
            results.skipped++
            results.details.push({ id: game.id, title: game.title, steam_appid: game.steam_appid ?? null, status: "skipped", message: "No Steam/IGDB/Chzzk data" })
          }
          continue
        }

        // --- 3. 데이터 병합 (Merge) - IGDB 우선, Steam 차선, 커버만 Chzzk 포스터 폴백 ---
        const ig = igdbData
        const st = steamData
        const priceFromSteam = st ? st.price_krw : null
        const priceFallback = searchPriceFallback?.price_krw != null ? searchPriceFallback : null

        // cover_image_url: IGDB → Steam → (없으면) Chzzk poster → null(기본 이미지)
        // header_image_url: 동일 우선순위. Chzzk 폴백 시 cover와 header 모두 동일 이미지 저장
        let coverImageUrl = ig?.image_url ?? st?.cover_image_url ?? null
        if (!coverImageUrl?.trim()) {
          const chzzkCategoryId = (englishTitle || fallbackTitle)?.trim()?.replace(/\s+/g, "_") || null
          if (chzzkCategoryId) {
            const chzzkPoster = await fetchChzzkGamePosterImage(chzzkCategoryId)
            if (chzzkPoster) {
              coverImageUrl = chzzkPoster
              console.log(`[Steam Update] Chzzk poster fallback for cover/header: ${game.title}`)
            }
            await delay(300)
          }
        }

        // release_date: IGDB only. release_dates 플랫폼별 최초 출시일 → first_release_date fallback
        let releaseDateStr: string | null = null
        if (ig?.igdb_game_id) {
          const earliestTs = await fetchEarliestReleaseDateFromIGDB(ig.igdb_game_id)
          await delay(300)
          const ts = earliestTs ?? (ig.release_date && typeof ig.release_date === "number" ? ig.release_date : null)
          if (ts != null && ts > 0) {
            const d = new Date(ts * 1000)
            if (!Number.isNaN(d.getTime())) releaseDateStr = d.toISOString().slice(0, 10)
          }
        }

        const updatePayload: Record<string, string | number | boolean | null | string[]> = {
          cover_image_url: coverImageUrl,
          header_image_url: ig?.image_url ?? st?.header_image_url ?? coverImageUrl ?? null,
          background_image_url: ig?.backdrop_url ?? st?.background_image_url ?? null,
          short_description: ig?.summary ?? st?.short_description ?? null,
          developer: ig?.developer ?? null,
          publisher: ig?.publisher ?? null,
          steam_appid: clearedBadSteamAppId ? null : (steamAppId ?? (st ? st.steam_appid : game.steam_appid)),
          price_krw: priceFromSteam ?? priceFallback?.price_krw ?? null,
          original_price_krw: (st ? st.original_price_krw : null) ?? priceFallback?.original_price_krw ?? null,
          discount_rate: (st ? st.discount_rate : null) ?? priceFallback?.discount_rate ?? null,
          is_free: st ? st.is_free : false,
          currency: (st ? st.currency : null) ?? priceFallback?.currency ?? null,
          platform: mapping?.skip_steam ? "non-steam" : (steamAppId != null ? "steam" : "unknown"),
          critic_score: ig?.critic_score ?? null,
          steam_review_desc: steamReviewSummary?.review_score_desc ?? null,
          steam_positive_ratio: steamReviewSummary?.steam_positive_ratio ?? null,
          steam_total_reviews: steamReviewSummary?.steam_total_reviews ?? null,
          release_date: releaseDateStr,
        }
        if (st) updatePayload.title = st.title

        // last_data_update: 시도 시각. game_data_update: 성공 시각 (update-evaluations는 갱신하지 않음)
        const now = new Date().toISOString()
        updatePayload.last_data_update = now
        updatePayload.game_data_update = now

        // [오버라이드] 매핑 테이블 값이 있으면 최우선 덮어쓰기
        if (mapping) {
          if (mapping.override_cover_image) updatePayload.cover_image_url = mapping.override_cover_image
          if (mapping.override_header_image) updatePayload.header_image_url = mapping.override_header_image
          if (mapping.override_background_image) updatePayload.background_image_url = mapping.override_background_image
          if (mapping.override_price !== null) {
            updatePayload.price_krw = mapping.override_price
            updatePayload.original_price_krw = mapping.override_price
            updatePayload.discount_rate = 0
          }
          if (mapping.override_is_free !== null) updatePayload.is_free = mapping.override_is_free
          if (mapping.steam_appid !== null) updatePayload.steam_appid = mapping.steam_appid
          else if (mapping.steam_appid === null && mapping.skip_steam) updatePayload.steam_appid = null

          // [skip_steam] 비스팀 게임: Steam 관련 필드 강제 초기화 (잘못 매핑된 데이터 정리)
          if (mapping.skip_steam) {
            updatePayload.steam_appid = null
            updatePayload.platform = "non-steam"
            updatePayload.price_krw = mapping.override_price ?? null
            updatePayload.original_price_krw = mapping.override_price ?? null
            updatePayload.discount_rate = mapping.override_price != null ? 0 : null
            updatePayload.currency = null
            updatePayload.is_free = mapping.override_is_free ?? null
            updatePayload.steam_review_desc = null
            updatePayload.steam_positive_ratio = null
            updatePayload.steam_total_reviews = null
          }
        }

        // Step C: 태그 (IGDB genres+themes 우선, 없으면 Steam tags) + 한글 변환
        const rawTags = (ig?.tags?.length ? ig.tags : st?.tags ?? []) as string[]
        const tags = rawTags.map((t) => TAG_TRANSLATIONS[t] ?? t)
        updatePayload.top_tags = tags.slice(0, 5)

        const { error: updateError } = await adminSupabase
          .from("games")
          .update(updatePayload)
          .eq("id", game.id)

        if (updateError) {
          console.error(`[Steam Update] ✗ DB update failed:`, updateError.message)
          results.failed++
          results.details.push({
            id: game.id,
            title: game.title,
            steam_appid: game.steam_appid ?? null,
            status: "failed",
            message: updateError.message,
          })
        } else {
          await clearForceUpdateFlag(forceUpdateSupabase, game.forceUpdateMappingTitle)
          if (tags.length > 0) {
            try {
              const tagIds: number[] = []
              for (const tagName of tags) {
                const slug = tagName
                  .toLowerCase()
                  .replace(/[^a-z0-9가-힣]+/g, "-")
                  .replace(/^-|-$/g, "")
                  || "untagged"
                const { data: tagData, error: tagError } = await adminSupabase
                  .from("tags")
                  .upsert({ name: tagName, slug }, { onConflict: "slug", ignoreDuplicates: false })
                  .select("id")
                  .single()
                if (tagError) {
                  const { data: existingTag } = await adminSupabase.from("tags").select("id").eq("slug", slug).single()
                  if (existingTag) tagIds.push(existingTag.id)
                } else if (tagData) tagIds.push(tagData.id)
              }
              await adminSupabase.from("game_tags").delete().eq("game_id", game.id)
              if (tagIds.length > 0) {
                await adminSupabase.from("game_tags").insert(tagIds.map((tagId) => ({ game_id: game.id, tag_id: tagId })))
              }
            } catch (tagErr) {
              console.error(`[Steam Update] Tag sync error:`, tagErr)
            }
          } else if (game.forceUpdateMappingTitle && mapping?.skip_steam && mapping?.skip_igdb) {
            const { error: tagDeleteError } = await adminSupabase
              .from("game_tags")
              .delete()
              .eq("game_id", game.id)
            if (tagDeleteError) {
              console.error(`[Steam Update] Tag cleanup error:`, tagDeleteError.message)
            }
          }
          console.log(`[Steam Update] ✓ Updated: ${game.title}`)
          results.updated++
          results.details.push({ id: game.id, title: game.title, steam_appid: game.steam_appid ?? null, status: "updated" })
        }
      } catch (error) {
        console.error(`[Steam Update] ✗ Error processing ${game.title}:`, error)
        results.failed++
        results.details.push({
          id: game.id,
          title: game.title,
          steam_appid: game.steam_appid ?? null,
          status: "failed",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    const duration = Date.now() - startTime

    console.log(`[Steam Update] Job completed in ${duration}ms`)
    console.log(`[Steam Update] Stats: ${results.updated} updated, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      message: `Updated ${results.updated} of ${results.total} games`,
      stats: {
        total: results.total,
        updated: results.updated,
        failed: results.failed,
        skipped: results.skipped,
        forceUpdateMappings: results.forceUpdateMappings,
        forceUpdateMatched: results.forceUpdateMatched,
      },
      details: results.details,
      duration,
    })

  } catch (error) {
    console.error("[Steam Update] Fatal error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  } finally {
    logCronAgainstHobbyTarget("update-steam", startTime)
  }
}

/**
 * Health check endpoint
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
