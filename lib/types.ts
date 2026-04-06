/* ── Database row types matching Supabase schema ── */

export interface GameRow {
  id: number
  title: string
  steam_appid: number | null
  cover_image_url: string | null
  header_image_url: string | null
  background_image_url: string | null
  discount_rate: number | null
  price_krw: number | null
  original_price_krw: number | null
  currency: string | null
  is_free: boolean | null
  last_data_update: string | null
  game_data_update?: string | null
  short_description?: string | null
  developer?: string | null
  publisher?: string | null
}

export interface StreamRow {
  id: number
  game_id: number | null
  title: string | null
  streamer_name: string | null
  viewer_count: number | null
  thumbnail_url: string | null
  is_live: boolean
  stream_category: string | null
  chzzk_channel_id: string | null
  last_chzzk_update: string | null
  has_drops?: boolean
  // joined
  games?: GameRow
}

export interface TagRow {
  id: number
  name: string
}

export interface EventRow {
  id: number
  title: string
  description: string | null
  event_type: string | null
  start_date: string
  end_date: string | null
  game_category: string | null
  header_image_url: string | null
  external_url: string | null
  games?: Pick<GameRow, "id" | "title" | "cover_image_url" | "header_image_url"> | null
}

/** 게임 상세 헤더: `game_top_streamers` TOP3 슬롯(비어 있으면 "---") */
export interface GameDetailTopStreamer {
  displayName: string
  /** 라이브 목록과 매칭된 경우에만 치지직 링크용 */
  channelId: string | null
}
