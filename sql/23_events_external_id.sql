-- ============================================
-- events 테이블에 external_id 컬럼 추가
-- ============================================
-- Execute in Supabase SQL Editor
-- 치지직 이스포츠 스케줄 API upsert 시 고유 식별자로 사용

ALTER TABLE events ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_external_id ON events(external_id) WHERE external_id IS NOT NULL;

COMMENT ON COLUMN events.external_id IS '외부 API 고유 식별자 (치지직 seq 등, upsert conflict key)';
