-- ============================================================
-- Migration: 001_create_daily_game_stats
-- 목적: 게임별 일일 피크 통계 테이블 생성 (V2 아키텍처용)
-- 실행: Supabase SQL Editor 또는 psql 에서 직접 실행
-- ============================================================

-- 1. 테이블 생성
CREATE TABLE IF NOT EXISTS public.daily_game_stats (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_id          BIGINT NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  record_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  peak_viewers     INT NOT NULL DEFAULT 0,
  peak_stream_count INT NOT NULL DEFAULT 0,
  trend_score      FLOAT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. UNIQUE 제약 조건: 게임당 날짜 1개 로우만 허용 (이미 존재하면 건너뜀)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_game_stats_game_id_record_date_key'
  ) THEN
    ALTER TABLE public.daily_game_stats
      ADD CONSTRAINT daily_game_stats_game_id_record_date_key
      UNIQUE (game_id, record_date);
  END IF;
END
$$;

-- 3. 인덱스: 날짜 내림차순 조회 최적화 (트렌딩/주간/월간 집계용)
CREATE INDEX IF NOT EXISTS idx_daily_game_stats_record_date
  ON public.daily_game_stats (record_date DESC);

-- 4. 인덱스: 게임별 이력 조회 최적화
CREATE INDEX IF NOT EXISTS idx_daily_game_stats_game_id
  ON public.daily_game_stats (game_id);

-- 5. 인덱스: trend_score 내림차순 (탐색 페이지 정렬용)
CREATE INDEX IF NOT EXISTS idx_daily_game_stats_trend_score
  ON public.daily_game_stats (trend_score DESC);

-- 6. RLS 비활성화 (서버 사이드 크론잡에서 Service Role Key 사용)
ALTER TABLE public.daily_game_stats DISABLE ROW LEVEL SECURITY;

-- 7. 테이블 코멘트
COMMENT ON TABLE public.daily_game_stats IS
  'V2: 게임별 일일 피크 통계. 1시간마다 update-daily-stats 크론잡이 GREATEST 비교로 Upsert.';
COMMENT ON COLUMN public.daily_game_stats.peak_viewers IS
  '당일 최고 동시 시청자 수 (여러 번 집계 중 가장 큰 값 유지)';
COMMENT ON COLUMN public.daily_game_stats.peak_stream_count IS
  '당일 최고 동시 라이브 스트리밍 수';
COMMENT ON COLUMN public.daily_game_stats.trend_score IS
  '트렌드 점수 = peak_viewers * (1 + LN(peak_stream_count + 1))';

-- ============================================================
-- 검증 쿼리 (실행 후 확인)
-- ============================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'daily_game_stats'
-- ORDER BY ordinal_position;
