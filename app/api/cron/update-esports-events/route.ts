import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * 치지직 이스포츠 채널 ID → 게임 카테고리명 매핑
 * game_category는 games 테이블의 korean_title/stream_category와 매칭됨
 */
const ESPORTS_CHANNEL_MAPPING: Record<string, string> = {
  ab067e483dcf6d16d4c07ea964e3b886: "리그 오브 레전드", // LCK CL
  "9381e7d6816e6d915a44a13c0195b202": "리그 오브 레전드", // LCK
  "92b762ef6fac0cc8c68bc080868ad582": "리그 오브 레전드", // LPL 공식
  "8b5e9e81fd8e81c2360390ef2b8e10c6": "리그 오브 레전드", // LEC 공식
  d32a29a1df20237194aa5757eb5f7cb1: "리그 오브 레전드", // LCS 공식
  "85de933f88c9f7ba1a2e364668b2ac86": "리그 오브 레전드", // CBLOL
  "41362c2ce80c61ea94d07026032f4602": "리그 오브 레전드", // LCP
  "2d8731009f2bdf883e4826ac413f5502": "PUBG: 배틀그라운드", // PUBG
}

interface ChzzkScheduleItem {
  seq: number
  scheduleDate: string
  scheduleTitle: string
  meta?: {
    gameTitle?: string
    homeTeamName?: string
    awayTeamName?: string
  }
  channel: {
    channelId: string
    channelName: string
    channelImageUrl?: string
  }
}

interface ChzzkEsportsResponse {
  code?: number
  content?: {
    data?: ChzzkScheduleItem[]
  }
}

const CHZZK_ESPORTS_API = "https://api.chzzk.naver.com/service/v1/program-schedules?filterId=esports"

/** Chzzk API fetch with retry (ECONNRESET 등 일시적 네트워크 오류 대응) */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3
): Promise<Response> {
  let lastError: unknown
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15_000)
      const res = await fetch(url, {
        ...options,
        headers: {
          "User-Agent": "Driflux/1.0 (+https://driflux.gg)",
          ...options.headers,
        },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return res
    } catch (err) {
      lastError = err
      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt - 1)
        console.warn(`[update-esports-events] Attempt ${attempt} failed, retrying in ${delay}ms:`, err)
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }
  throw lastError
}

export const maxDuration = 60

/**
 * Cron Job API: 치지직 이스포츠 스케줄 → Supabase events Upsert
 *
 * GET /api/cron/update-esports-events
 *
 * external_id(seq) 기준으로 upsert하여 TBD 등 나중에 확정되는 대진표를 최신화합니다.
 * Vercel Cron 등으로 주기적 호출 권장.
 */
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Missing Supabase credentials" },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const res = await fetchWithRetry(CHZZK_ESPORTS_API)
    if (!res.ok) {
      throw new Error(`Chzzk API error: ${res.status} ${res.statusText}`)
    }

    const json = (await res.json()) as ChzzkEsportsResponse
    const items = json.content?.data ?? []
    const totalApiResponse = items.length

    /* 1. 다음 달 말일 계산 */
    const now = new Date()
    const targetEndDate = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59)

    /* 2. 기간 + 채널(화이트리스트) 필터링 */
    const filteredItems = items.filter((item: ChzzkScheduleItem) => {
      const isAllowedChannel = Object.keys(ESPORTS_CHANNEL_MAPPING).includes(item.channel.channelId)
      const eventDate = new Date(item.scheduleDate)
      const isWithinDateRange = eventDate <= targetEndDate
      return isAllowedChannel && isWithinDateRange
    })

    const filteredCount = filteredItems.length

    const formattedEvents = filteredItems.map((item: ChzzkScheduleItem) => {
      const meta = item.meta ?? {}
      const homeTeam = meta.homeTeamName?.trim()
      const awayTeam = meta.awayTeamName?.trim()
      const hasBothTeams = homeTeam && awayTeam && homeTeam !== "TBD" && awayTeam !== "TBD"

      const description = hasBothTeams
        ? `${homeTeam} vs ${awayTeam}`
        : (item.scheduleTitle ?? "")

      const gameTitle = meta.gameTitle?.trim()
      const title = `[${item.channel.channelName}] ${gameTitle || item.scheduleTitle}`

      const gameCategory = ESPORTS_CHANNEL_MAPPING[item.channel.channelId]

      /* scheduleDate "YYYY-MM-DD HH:MI:SS" (KST) → ISO 8601 with timezone */
      const startDateIso = item.scheduleDate.replace(" ", "T") + "+09:00"

      return {
        external_id: item.seq.toString(),
        title,
        description,
        event_type: "Esports",
        start_date: startDateIso,
        end_date: null,
        game_category: gameCategory,
        header_image_url: item.channel.channelImageUrl?.trim() ?? null,
        external_url: `https://chzzk.naver.com/live/${item.channel.channelId}`,
      }
    })

    if (formattedEvents.length === 0) {
      return NextResponse.json({
        success: true,
        totalApiResponse,
        filteredCount: 0,
        upserted: 0,
        message: "No esports events to upsert after filtering",
      })
    }

    const { data, error } = await supabase
      .from("events")
      .upsert(formattedEvents, {
        onConflict: "external_id",
        ignoreDuplicates: false,
      })
      .select("id")

    if (error) {
      console.error("[update-esports-events] Supabase upsert error:", error)
      return NextResponse.json(
        { error: "Upsert failed", details: error.message },
        { status: 500 }
      )
    }

    const upsertedCount = data?.length ?? formattedEvents.length

    return NextResponse.json({
      success: true,
      totalApiResponse,
      filteredCount,
      upserted: upsertedCount,
    })
  } catch (err) {
    console.error("[update-esports-events] Error:", err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
