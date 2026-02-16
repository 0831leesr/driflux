-- ============================================
-- 스트림 수집 디버깅 쿼리
-- ============================================

-- 1. streams 테이블에 데이터가 있는지 확인
SELECT COUNT(*) as total_streams FROM streams;

-- 2. 최근 업데이트된 스트림 확인
SELECT 
  id,
  streamer_name,
  title,
  is_live,
  viewer_count,
  stream_category,
  game_id,
  last_chzzk_update,
  created_at
FROM streams
ORDER BY last_chzzk_update DESC NULLS LAST
LIMIT 10;

-- 3. 라이브 스트림만 확인
SELECT 
  id,
  streamer_name,
  title,
  viewer_count,
  stream_category
FROM streams
WHERE is_live = true
ORDER BY viewer_count DESC;

-- 4. 스트림 카테고리별 집계
SELECT 
  stream_category,
  COUNT(*) as count,
  SUM(CASE WHEN is_live THEN 1 ELSE 0 END) as live_count
FROM streams
GROUP BY stream_category
ORDER BY count DESC;

-- 5. 모든 스트림 데이터 (최근 10개)
SELECT * FROM streams 
ORDER BY created_at DESC 
LIMIT 10;
