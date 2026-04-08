-- TOP 스트리머 갱신 대상 game_id: 최근 로그만 (전체 DISTINCT는 행 수 폭증 시에도 가벼움)

CREATE OR REPLACE FUNCTION public.fetch_game_ids_for_top_streamer_update()
RETURNS TABLE (game_id bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT x.game_id
  FROM (
    SELECT DISTINCT s.game_id
    FROM public.streamer_game_logs s
    WHERE s.log_date >= ((now() AT TIME ZONE 'Asia/Seoul')::date - 14)
    UNION
    SELECT g.game_id FROM public.game_top_streamers g
  ) x
  ORDER BY x.game_id;
$$;

REVOKE ALL ON FUNCTION public.fetch_game_ids_for_top_streamer_update() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fetch_game_ids_for_top_streamer_update() TO service_role;
