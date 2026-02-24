-- ============================================
-- Create game_videos Table (Chzzk VOD Cache)
-- ============================================
-- 치지직 다시보기 영상 캐시 - cron이 1일 1회 갱신
-- Execute in Supabase SQL Editor

-- 1. game_videos 테이블 생성
CREATE TABLE IF NOT EXISTS game_videos (
  id BIGSERIAL PRIMARY KEY,
  category_id TEXT NOT NULL,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  video_title TEXT NOT NULL,
  thumbnail_url TEXT,
  read_count INTEGER DEFAULT 0,
  channel_name TEXT,
  channel_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, video_id)
);

-- 2. 인덱스 (조회 성능)
CREATE INDEX IF NOT EXISTS idx_game_videos_category_id ON game_videos(category_id);
CREATE INDEX IF NOT EXISTS idx_game_videos_game_id ON game_videos(game_id);
CREATE INDEX IF NOT EXISTS idx_game_videos_updated_at ON game_videos(updated_at);

-- 3. RLS 활성화
ALTER TABLE game_videos ENABLE ROW LEVEL SECURITY;

-- 4. 정책: 누구나 읽기(Select) 가능
CREATE POLICY "Allow public read access on game_videos"
  ON game_videos FOR SELECT
  USING (true);
