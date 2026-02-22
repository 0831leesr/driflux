-- ============================================
-- events: game_id 제거, game_category 추가
-- ============================================
-- Execute in Supabase SQL Editor
-- game_category: 치지직 게임 카테고리 이름 (games.korean_title, streams.stream_category 등과 매칭)

-- 1. game_id 인덱스 제거 (컬럼 제거 시 FK는 자동 제거됨)
DROP INDEX IF EXISTS idx_events_game_id;

-- 2. game_id 컬럼 제거 (FK 제약도 함께 제거됨)
ALTER TABLE events DROP COLUMN IF EXISTS game_id;

-- 3. game_category 컬럼 추가
ALTER TABLE events ADD COLUMN IF NOT EXISTS game_category TEXT;

-- 4. 인덱스 (game_category로 게임 조회 시 사용)
CREATE INDEX IF NOT EXISTS idx_events_game_category ON events(game_category) WHERE game_category IS NOT NULL;

-- 5. 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'events'
ORDER BY ordinal_position;
