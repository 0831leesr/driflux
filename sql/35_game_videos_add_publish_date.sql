-- game_videos: 치지직 다시보기 게시 시각 (API publishDate 캐시)
-- Supabase SQL Editor에서 실행

ALTER TABLE game_videos
  ADD COLUMN IF NOT EXISTS publish_date TEXT;

COMMENT ON COLUMN game_videos.publish_date IS 'Chzzk VOD publishDate (ISO string from API)';
