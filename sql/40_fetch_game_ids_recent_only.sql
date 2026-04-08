-- TOP 스트리머 갱신용 game_id (39번 함수 정의를 대체·최적화: 최근 14일 로그만 DISTINCT)

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
