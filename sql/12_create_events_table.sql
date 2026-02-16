-- ============================================
-- Create Events Table (Calendar)
-- ============================================
-- 게임 출시, 업데이트, 토너먼트, 할인 등 이벤트 관리
-- Execute in Supabase SQL Editor

-- 1. events 테이블 생성
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT CHECK (event_type IN ('Competition', 'Patch', 'Discount')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  game_id INTEGER REFERENCES games(id) ON DELETE SET NULL,
  external_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 인덱스 (조회 성능)
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_game_id ON events(game_id) WHERE game_id IS NOT NULL;

-- 3. RLS 활성화
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 4. 정책: 누구나 읽기(Select) 가능
CREATE POLICY "Allow public read access on events"
  ON events FOR SELECT
  USING (true);

-- 5. 정책: 관리자만 쓰기
-- INSERT/UPDATE/DELETE에 대한 정책을 생성하지 않음
-- → anon, authenticated 역할은 쓰기 불가
-- → 서비스 롤(API 라우트 등)을 통해서만 쓰기 가능
-- 관리자를 Supabase Auth로 사용하려면 아래 주석을 해제하고, JWT에 role 설정 후 적용

-- CREATE POLICY "Allow admin insert on events"
--   ON events FOR INSERT
--   WITH CHECK (
--     (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
--   );
-- CREATE POLICY "Allow admin update on events"
--   ON events FOR UPDATE
--   USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
-- CREATE POLICY "Allow admin delete on events"
--   ON events FOR DELETE
--   USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 6. 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'events'
ORDER BY ordinal_position;
