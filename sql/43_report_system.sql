-- ============================================================
-- 게임 정보 오류 신고 시스템
-- ============================================================

-- 1. game_error_reports 테이블 생성
CREATE TABLE IF NOT EXISTS game_error_reports (
  game_id      TEXT        PRIMARY KEY,
  image_count  INT         NOT NULL DEFAULT 0,
  title_count  INT         NOT NULL DEFAULT 0,
  price_count  INT         NOT NULL DEFAULT 0,
  link_count   INT         NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: 서비스 롤만 접근 (anon/authenticated는 RPC 경유)
ALTER TABLE game_error_reports ENABLE ROW LEVEL SECURITY;

-- 서비스 롤(서버 액션)은 항상 통과
CREATE POLICY "service_role_all" ON game_error_reports
  FOR ALL USING (auth.role() = 'service_role');

-- 2. increment_game_reports RPC 함수 생성
--    game_id 와 각 항목 체크 여부(boolean)를 받아
--    해당 카운트를 +1 하거나 새로 삽입함
CREATE OR REPLACE FUNCTION increment_game_reports(
  p_game_id    TEXT,
  p_image      BOOLEAN DEFAULT FALSE,
  p_title      BOOLEAN DEFAULT FALSE,
  p_price      BOOLEAN DEFAULT FALSE,
  p_link       BOOLEAN DEFAULT FALSE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO game_error_reports (
    game_id,
    image_count,
    title_count,
    price_count,
    link_count,
    updated_at
  )
  VALUES (
    p_game_id,
    CASE WHEN p_image THEN 1 ELSE 0 END,
    CASE WHEN p_title THEN 1 ELSE 0 END,
    CASE WHEN p_price THEN 1 ELSE 0 END,
    CASE WHEN p_link  THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (game_id) DO UPDATE
    SET
      image_count = game_error_reports.image_count + CASE WHEN p_image THEN 1 ELSE 0 END,
      title_count = game_error_reports.title_count + CASE WHEN p_title THEN 1 ELSE 0 END,
      price_count = game_error_reports.price_count + CASE WHEN p_price THEN 1 ELSE 0 END,
      link_count  = game_error_reports.link_count  + CASE WHEN p_link  THEN 1 ELSE 0 END,
      updated_at  = now();
END;
$$;
