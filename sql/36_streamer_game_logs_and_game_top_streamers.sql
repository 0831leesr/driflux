-- ============================================
-- Streamer daily logs (per game, KST date) + merged TOP 3 cache
-- ============================================

-- 1) Raw logs: populate via your ingestion job (one row per game/day/streamer, peak viewers that day)
CREATE TABLE IF NOT EXISTS streamer_game_logs (
  id BIGSERIAL PRIMARY KEY,
  game_id BIGINT NOT NULL REFERENCES games (id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  streamer_name TEXT NOT NULL,
  peak_viewers BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT streamer_game_logs_game_date_name UNIQUE (game_id, log_date, streamer_name)
);

CREATE INDEX IF NOT EXISTS idx_streamer_game_logs_game_date
  ON streamer_game_logs (game_id, log_date DESC);

CREATE INDEX IF NOT EXISTS idx_streamer_game_logs_log_date
  ON streamer_game_logs (log_date DESC);

COMMENT ON TABLE streamer_game_logs IS 'Per-game daily streamer stats; log_date is KST calendar date.';

-- 2) Cached smart-merge TOP 3 (updated by cron: lib/actions/update-top-streamers.ts)
CREATE TABLE IF NOT EXISTS game_top_streamers (
  game_id BIGINT PRIMARY KEY REFERENCES games (id) ON DELETE CASCADE,
  rank1_name TEXT,
  rank1_viewers BIGINT,
  rank2_name TEXT,
  rank2_viewers BIGINT,
  rank3_name TEXT,
  rank3_viewers BIGINT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE game_top_streamers IS 'Recent popular streamers TOP 3 per game (yesterday logs + merge with previous row).';
