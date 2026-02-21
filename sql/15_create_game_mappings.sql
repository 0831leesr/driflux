-- Game Mappings: Supabase 기반 유연한 부분 오버라이드 시스템
-- CHZZK 게임 이름 → Steam/IGDB/metadata 매핑 (하드코딩 대체)
--
-- chzzk_title: 치지직에서 표시되는 게임 이름 (매칭 키, 다수 행 가능: "리그 오브 레전드", "LOL", "롤")
-- steam_appid: 스팀 AppID (null = 스팀에 없음, number = 직접 매핑)
-- skip_steam: true면 Steam 검색/조회 완전 스킵
-- skip_igdb: true면 IGDB 검색 스킵
-- override_*: 값이 있으면 IGDB/Steam 결과와 무관하게 해당 값으로 덮어쓰기

CREATE TABLE IF NOT EXISTS game_mappings (
  id SERIAL PRIMARY KEY,
  chzzk_title TEXT NOT NULL,
  steam_appid INTEGER,
  skip_steam BOOLEAN NOT NULL DEFAULT false,
  skip_igdb BOOLEAN NOT NULL DEFAULT false,
  steam_title TEXT,
  igdb_title TEXT,
  override_cover_image TEXT,
  override_header_image TEXT,
  override_background_image TEXT,
  override_price INTEGER,
  override_is_free BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_game_mappings_chzzk_title 
  ON game_mappings (chzzk_title);

CREATE INDEX IF NOT EXISTS idx_game_mappings_chzzk_title_lower 
  ON game_mappings (LOWER(chzzk_title));

COMMENT ON TABLE game_mappings IS 'Chzzk game title → Steam/IGDB overrides. Replaces hardcoded CHZZK_STEAM_MAPPINGS.';
COMMENT ON COLUMN game_mappings.skip_steam IS 'true = Steam 검색/조회 스킵 (non-Steam 게임)';
COMMENT ON COLUMN game_mappings.skip_igdb IS 'true = IGDB 검색 스킵';
COMMENT ON COLUMN game_mappings.steam_title IS 'Steam 검색 시 사용할 타이틀 (null이면 기본 검색어 사용)';
COMMENT ON COLUMN game_mappings.igdb_title IS 'IGDB 검색 시 사용할 타이틀 (null이면 기본 검색어 사용)';
COMMENT ON COLUMN game_mappings.override_price IS '덮어쓸 가격 (KRW), null이면 API 결과 유지';

-- 시드: 리그 오브 레전드 (skip_steam, override_is_free)
INSERT INTO game_mappings (chzzk_title, steam_appid, skip_steam, skip_igdb, override_is_free, notes)
VALUES 
  ('리그 오브 레전드', NULL, true, false, true, '라이엇 게임즈 독자 플랫폼'),
  ('League of Legends', NULL, true, false, true, 'Riot Games'),
  ('LOL', NULL, true, false, true, '약칭'),
  ('롤', NULL, true, false, true, '약칭')
ON CONFLICT (chzzk_title) DO NOTHING;
