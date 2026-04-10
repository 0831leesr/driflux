-- P0: top-streamers 크론 — RPC로 game_id 집합 축소 + 키셋 스캔 보조 인덱스
-- 적용: Supabase SQL Editor 또는 `npm run migrate`

-- 어제(KST) 로그가 있는 게임 ∪ 기존 TOP3 행이 있는 게임
CREATE OR REPLACE FUNCTION public.fetch_game_ids_for_top_streamer_update()
RETURNS TABLE (game_id bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT u.gid::bigint AS game_id
  FROM (
    SELECT sgl.game_id AS gid
    FROM streamer_game_logs sgl
    WHERE (sgl.log_date::date) = ((current_timestamp AT TIME ZONE 'Asia/Seoul')::date - INTERVAL '1 day')
    UNION
    SELECT gts.game_id AS gid
    FROM game_top_streamers gts
  ) u
  WHERE u.gid IS NOT NULL
  ORDER BY 1;
$$;

COMMENT ON FUNCTION public.fetch_game_ids_for_top_streamer_update() IS
  'Returns distinct game_ids to merge yesterday (KST) streamer_game_logs into game_top_streamers; used by /api/cron/update-top-streamers';

-- 키셋 스캔 폴백(id 오름차순)에 도움
CREATE INDEX IF NOT EXISTS idx_streamer_game_logs_id_asc ON public.streamer_game_logs (id);

-- log_date + game_id 조회·DISTINCT에 도움 (RPC와 정합)
CREATE INDEX IF NOT EXISTS idx_streamer_game_logs_log_date_game_id ON public.streamer_game_logs (log_date, game_id);
