-- ============================================
-- events 테이블에 header_image_url 컬럼 추가
-- ============================================
-- Execute in Supabase SQL Editor
-- Calendar 탭 상단 이벤트 카드 썸네일에 사용 (지정 시 우선 표시)

ALTER TABLE events ADD COLUMN IF NOT EXISTS header_image_url TEXT;

COMMENT ON COLUMN events.header_image_url IS '이벤트 헤더 이미지 URL (Calendar 상단 카드 썸네일, 미지정 시 game_category 게임 이미지 사용)';
