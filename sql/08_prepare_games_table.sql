-- ============================================
-- Prepare Games Table for Chzzk Integration
-- ============================================

-- Step 1: 기존 데이터 백업 (선택사항)
-- CREATE TABLE games_backup AS SELECT * FROM games;

-- Step 2: games 테이블 초기화 (주의!)
DELETE FROM streams;    -- ⭐ 추가: streams 먼저 삭제
DELETE FROM game_tags;  -- 연결 테이블 삭제
DELETE FROM games;      -- 이제 안전하게 삭제 가능

-- Step 3: ID 시퀀스 초기화
ALTER SEQUENCE games_id_seq RESTART WITH 1;

-- Step 4: 필수 컬럼 추가
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS slug TEXT;

ALTER TABLE games 
ADD COLUMN IF NOT EXISTS total_viewers BIGINT DEFAULT 0;

ALTER TABLE games 
ADD COLUMN IF NOT EXISTS popularity_rank INTEGER;

ALTER TABLE games 
ADD COLUMN IF NOT EXISTS last_popularity_update TIMESTAMPTZ;

-- Step 5: 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_games_slug ON games(slug);
CREATE INDEX IF NOT EXISTS idx_games_total_viewers ON games(total_viewers DESC);
CREATE INDEX IF NOT EXISTS idx_games_popularity_rank ON games(popularity_rank);

-- Step 6: 제약조건 추가 (중복 방지)
-- 기존 제약조건 삭제 후 재생성
ALTER TABLE games 
DROP CONSTRAINT IF EXISTS unique_games_slug;

ALTER TABLE games 
ADD CONSTRAINT unique_games_slug UNIQUE (slug);

-- Step 7: 확인
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'games'
ORDER BY ordinal_position;

SELECT COUNT(*) as game_count FROM games;
-- Should be 0

-- ============================================
-- 준비 완료! 이제 API를 실행하세요
-- ============================================
-- http://localhost:3000/api/cron/discover-top-games?size=20
