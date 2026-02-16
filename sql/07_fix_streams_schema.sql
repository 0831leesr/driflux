-- ============================================
-- Fix Streams Table Schema
-- ============================================
-- streams 테이블에 누락된 컬럼 추가

-- 1. created_at 컬럼 추가 (없는 경우)
ALTER TABLE streams 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. updated_at 컬럼 추가 (선택사항)
ALTER TABLE streams 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_streams_created_at ON streams(created_at);
CREATE INDEX IF NOT EXISTS idx_streams_is_live ON streams(is_live) WHERE is_live = true;
CREATE INDEX IF NOT EXISTS idx_streams_game_id ON streams(game_id) WHERE game_id IS NOT NULL;

-- 4. 현재 테이블 구조 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'streams'
ORDER BY ordinal_position;

-- 5. 샘플 데이터 확인 (테이블이 비어있을 수 있음)
SELECT COUNT(*) as total_count FROM streams;
