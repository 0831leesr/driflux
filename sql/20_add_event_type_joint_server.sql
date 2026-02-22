-- ============================================
-- event_type에 '합동 서버' 추가
-- ============================================
-- Execute in Supabase SQL Editor
-- 기존: Esports, Patch, Discount
-- 추가: 합동 서버

-- 1. 기존 event_type CHECK 제약 제거 (이름이 다를 수 있음)
ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_event_type;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_type_check;

-- 2. event_type CHECK 제약 추가 (합동 서버 포함)
-- Esports, Patch, Discount, 합동 서버
ALTER TABLE events
  ADD CONSTRAINT chk_event_type
  CHECK (event_type IN ('Esports', 'Patch', 'Discount', '합동 서버'));

-- 3. 확인
SELECT DISTINCT event_type FROM events;
