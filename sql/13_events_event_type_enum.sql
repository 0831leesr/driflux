-- ============================================
-- Events event_type: Free text → Enum (Competition, Patch, Discount)
-- ============================================
-- Execute in Supabase SQL Editor after 12_create_events_table.sql

-- 1. 기존 체크 제약이 있다면 제거
ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_event_type;

-- 2. event_type CHECK 제약 추가 (Competition, Patch, Discount 중 선택)
ALTER TABLE events
  ADD CONSTRAINT chk_event_type
  CHECK (event_type IN ('Competition', 'Patch', 'Discount'));

-- 3. (선택) 기존 데이터 중 허용되지 않은 값을 NULL 또는 기본값으로 변경
-- UPDATE events SET event_type = 'Patch' WHERE event_type IS NULL OR event_type NOT IN ('Competition', 'Patch', 'Discount');

-- 4. 확인
SELECT DISTINCT event_type FROM events;
