-- ============================================================
-- Migration: 002_daily_game_stats_momentum
-- 목적: 급상승(Momentum) 점수용 컬럼 추가
-- 실행: Supabase SQL Editor 또는 psql
-- ============================================================

ALTER TABLE public.daily_game_stats
  ADD COLUMN IF NOT EXISTS current_viewers INT NOT NULL DEFAULT 0;

ALTER TABLE public.daily_game_stats
  ADD COLUMN IF NOT EXISTS previous_viewers INT NOT NULL DEFAULT 0;

ALTER TABLE public.daily_game_stats
  ADD COLUMN IF NOT EXISTS momentum_score INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_daily_game_stats_momentum_score
  ON public.daily_game_stats (momentum_score DESC);

COMMENT ON COLUMN public.daily_game_stats.current_viewers IS
  '직전 크론 실행 시점 치지직 API 동시 시청자 수 (최신 스냅샷)';
COMMENT ON COLUMN public.daily_game_stats.previous_viewers IS
  '이전 스냅샷의 시청자 수 (갱신 전 current_viewers 보존)';
COMMENT ON COLUMN public.daily_game_stats.momentum_score IS
  '급상승 점수: current - previous, 증가 100명 미만·하락 시 0';
