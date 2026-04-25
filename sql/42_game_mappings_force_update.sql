-- game_mappings: allow operators to force one update-steam pass for corrected mappings.
--
-- Use this when a game was previously mapped to wrong Steam/IGDB data, or when
-- skip_steam/skip_igdb mappings need to be applied even though normal cron
-- selection would skip them.

ALTER TABLE game_mappings
  ADD COLUMN IF NOT EXISTS force_update BOOLEAN NOT NULL DEFAULT false;

-- 일부 DB에는 `updated_at`이 없을 수 있어, 타임스탬프가 아닌 `chzzk_title`을 사용합니다.
-- (15_create_game_mappings.sql 스키마와 다른 프로젝트도 있음)
CREATE INDEX IF NOT EXISTS idx_game_mappings_force_update_true
  ON game_mappings (chzzk_title)
  WHERE force_update = true;

COMMENT ON COLUMN game_mappings.force_update IS
  'true = next update-steam run should prioritize this mapping once, then clear it on success';
