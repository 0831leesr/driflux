-- streamer_game_logs 전체 스캔(select game_id) 대신 DISTINCT game_id만 반환 (크론 타임아웃·페이로드 폭주 방지)

CREATE OR REPLACE FUNCTION public.fetch_game_ids_for_top_streamer_update()
RETURNS TABLE (game_id bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT x.game_id
  FROM (
    SELECT DISTINCT s.game_id AS game_id FROM public.streamer_game_logs s
    UNION
    SELECT g.game_id FROM public.game_top_streamers g
  ) x
  ORDER BY x.game_id;
$$;

REVOKE ALL ON FUNCTION public.fetch_game_ids_for_top_streamer_update() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fetch_game_ids_for_top_streamer_update() TO service_role;
