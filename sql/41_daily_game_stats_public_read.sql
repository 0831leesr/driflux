-- daily_game_stats: 홈/탐색의 어제·주간·월간 트렌드·급상승 조회용 공개 SELECT (anon)
-- createClientForCache()는 anon 키를 사용합니다. RLS만 켜져 있고 정책이 없으면 0행만 반환되어
-- "No daily_game_stats rows for period=yesterday" 경고가 납니다. 크론(service_role)은 RLS를 우회합니다.

ALTER TABLE public.daily_game_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read daily_game_stats" ON public.daily_game_stats;

CREATE POLICY "Allow public read daily_game_stats"
  ON public.daily_game_stats
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON TABLE public.daily_game_stats IS
  'V2: 게임별 일일 피크 통계. anon SELECT는 트렌딩 UI용; 쓰기는 service_role 크론.';
