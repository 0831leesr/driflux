-- games.release_date: 발매일 (IGDB first_release_date, Steam release_date.date)
-- Unix timestamp 또는 'YYYY-MM-DD' 형식 저장 가능. DATE 타입 사용.

ALTER TABLE games
ADD COLUMN IF NOT EXISTS release_date DATE;

COMMENT ON COLUMN games.release_date IS 'Game release date (from IGDB first_release_date or Steam release_date)';

-- 정렬/필터용 인덱스 (신규 출시순 등)
CREATE INDEX IF NOT EXISTS idx_games_release_date ON games(release_date DESC NULLS LAST);
