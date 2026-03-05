-- game_data_update: 실제로 데이터 갱신에 성공한 날짜 (Steam/IGDB/매핑 등)
-- last_data_update: 성공 여부와 관계없이 갱신 시도한 날짜
-- 선정: game_data_update 오래된 순 → last_data_update 오래된 순

ALTER TABLE games ADD COLUMN IF NOT EXISTS game_data_update TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_games_game_data_update ON games(game_data_update);

COMMENT ON COLUMN games.game_data_update IS '실제 데이터 갱신 성공 시각. last_data_update=시도 시각.';
