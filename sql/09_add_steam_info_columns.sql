-- ============================================
-- Add Steam Info Columns to Games Table
-- ============================================

-- Step 1: Add top_tags column (최대 5개의 태그)
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS top_tags TEXT[] DEFAULT '{}';

-- Step 2: 인덱스 추가 (태그 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_games_top_tags ON games USING GIN (top_tags);

-- Step 3: 확인
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'games' 
  AND column_name IN ('steam_appid', 'cover_image_url', 'price_krw', 'top_tags')
ORDER BY ordinal_position;

-- ============================================
-- 준비 완료!
-- ============================================
