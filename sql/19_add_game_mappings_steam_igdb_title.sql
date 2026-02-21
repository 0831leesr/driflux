-- game_mappings: steam_title, igdb_title 컬럼 추가
-- chzzk_title 기반으로 Steam/IGDB 검색 시 사용할 타이틀을 강제 지정
--
-- steam_title: NULL이 아니면 Steam 검색 시 이 타이틀로 검색 (skip_steam=false일 때)
-- igdb_title: NULL이 아니면 IGDB 검색 시 이 타이틀로 검색 (skip_igdb=false일 때)

ALTER TABLE game_mappings
  ADD COLUMN IF NOT EXISTS steam_title TEXT,
  ADD COLUMN IF NOT EXISTS igdb_title TEXT;

COMMENT ON COLUMN game_mappings.steam_title IS 'Steam 검색 시 사용할 타이틀 (null이면 기본 검색어 사용)';
COMMENT ON COLUMN game_mappings.igdb_title IS 'IGDB 검색 시 사용할 타이틀 (null이면 기본 검색어 사용)';
