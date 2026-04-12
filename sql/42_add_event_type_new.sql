-- ============================================
-- event_type에 'New' 추가 (IGDB 기대작 출시일 이벤트)
-- ============================================
-- Execute in Supabase SQL Editor
-- 기존: Esports, Patch, Discount, 합동 서버
-- 추가: New (신작 출시일)

-- 1. 기존 event_type CHECK 제약 제거
ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_event_type;

-- 2. event_type CHECK 제약 추가 (New 포함)
ALTER TABLE events
  ADD CONSTRAINT chk_event_type
  CHECK (event_type IN ('Esports', 'Patch', 'Discount', '합동 서버', 'New'));

-- 3. 확인
SELECT DISTINCT event_type FROM events;
