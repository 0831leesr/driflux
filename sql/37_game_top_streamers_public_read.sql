-- game_top_streamers: 게임 상세 등 공개 조회(anon) 허용
ALTER TABLE game_top_streamers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read game_top_streamers" ON game_top_streamers;

CREATE POLICY "Allow public read game_top_streamers"
  ON game_top_streamers
  FOR SELECT
  TO anon, authenticated
  USING (true);
