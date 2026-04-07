-- 프로필 이미지 URL 캐시 (일일 로그·TOP3 집계 시 치지직 스냅샷과 함께 저장)

ALTER TABLE streamer_game_logs
  ADD COLUMN IF NOT EXISTS channel_image_url TEXT NULL;

ALTER TABLE game_top_streamers
  ADD COLUMN IF NOT EXISTS rank1_profile_image_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS rank2_profile_image_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS rank3_profile_image_url TEXT NULL;
