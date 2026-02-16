-- Check games table schema
-- Run this to verify your current setup before upgrading

-- Check which columns exist
SELECT 
  column_name,
  data_type,
  column_default,
  CASE 
    WHEN column_name = 'steam_appid' THEN '✓ v1.0 (스팀 AppID)'
    WHEN column_name = 'korean_title' THEN '✓ v1.0 (한글 제목)'
    WHEN column_name = 'platform' THEN '✓ v2.0 (플랫폼 분류)'
    WHEN column_name = 'english_title' THEN '✓ v3.0 (영어 제목)'
    WHEN column_name = 'top_tags' THEN '✓ 스팀 태그'
    WHEN column_name = 'price_krw' THEN '✓ 가격 정보'
    ELSE ''
  END as feature
FROM information_schema.columns
WHERE table_name = 'games'
  AND column_name IN (
    'id',
    'title',
    'korean_title',
    'english_title',
    'platform',
    'steam_appid',
    'price_krw',
    'top_tags',
    'popularity_rank'
  )
ORDER BY 
  CASE column_name
    WHEN 'id' THEN 1
    WHEN 'title' THEN 2
    WHEN 'korean_title' THEN 3
    WHEN 'english_title' THEN 4
    WHEN 'platform' THEN 5
    WHEN 'steam_appid' THEN 6
    WHEN 'price_krw' THEN 7
    WHEN 'top_tags' THEN 8
    WHEN 'popularity_rank' THEN 9
    ELSE 99
  END;

-- Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'games'
  AND indexname IN (
    'idx_games_platform',
    'idx_games_english_title',
    'idx_games_steam_appid'
  )
ORDER BY indexname;

-- Sample data
SELECT 
  'Sample Data' as info,
  COUNT(*) as total_games,
  COUNT(steam_appid) as has_steam_appid,
  COUNT(korean_title) as has_korean_title,
  COUNT(CASE WHEN column_exists('platform') THEN platform END) as has_platform,
  COUNT(CASE WHEN column_exists('english_title') THEN english_title END) as has_english_title
FROM games;

-- Helper function to check if column exists
CREATE OR REPLACE FUNCTION column_exists(col_name text) 
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'games' 
      AND column_name = col_name
  );
END;
$$ LANGUAGE plpgsql;
