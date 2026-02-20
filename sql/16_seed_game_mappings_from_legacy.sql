-- 기존 CHZZK_STEAM_MAPPINGS 하드코딩 → game_mappings 마이그레이션 시드
-- 이 스크립트는 15_create_game_mappings.sql 실행 후 선택적으로 실행하세요.
-- ON CONFLICT (chzzk_title) DO NOTHING 이므로 이미 있는 행은 건너뜁니다.

-- 스팀에 없는 게임들 (skip_steam = true)
INSERT INTO game_mappings (chzzk_title, steam_appid, skip_steam, skip_igdb, override_is_free, notes)
VALUES
  ('배틀그라운드 모바일', NULL, true, false, true, '모바일 게임'),
  ('PUBG Mobile', NULL, true, false, true, '모바일'),
  ('하스스톤', NULL, true, false, true, '배틀넷 전용'),
  ('Hearthstone', NULL, true, false, true, 'Battle.net'),
  ('던전앤파이터', NULL, true, false, NULL, '넥슨'),
  ('메이플스토리', NULL, true, false, NULL, '넥슨'),
  ('MapleStory', NULL, true, false, NULL, 'Nexon'),
  ('발로란트', NULL, true, false, true, '라이엇'),
  ('VALORANT', NULL, true, false, true, 'Riot'),
  ('TFT', NULL, true, false, true, 'Teamfight Tactics'),
  ('Teamfight Tactics', NULL, true, false, true, 'Riot'),
  ('오버워치 2', NULL, true, false, true, '배틀넷'),
  ('Overwatch 2', NULL, true, false, true, 'Battle.net'),
  ('디아블로 4', NULL, true, false, NULL, '배틀넷'),
  ('Diablo IV', NULL, true, false, NULL, 'Battle.net'),
  ('스타크래프트', NULL, true, false, true, '배틀넷'),
  ('StarCraft', NULL, true, false, true, 'Battle.net'),
  ('마인크래프트', NULL, true, false, NULL, '자체 런처'),
  ('Minecraft', NULL, true, false, NULL, '자체 런처'),
  ('원신', NULL, true, false, true, '스팀 X'),
  ('Genshin Impact', NULL, true, false, true, 'Not on Steam'),
  ('FC Online', NULL, true, false, NULL, '넥슨'),
  ('FC온라인', NULL, true, false, NULL, '넥슨'),
  ('피파온라인4', NULL, true, false, NULL, '넥슨'),
  ('서든어택', NULL, true, false, NULL, '넥슨'),
  ('카트라이더', NULL, true, false, NULL, '넥슨')
ON CONFLICT (chzzk_title) DO NOTHING;

-- 스팀 게임들 (steam_appid 직접 매핑)
INSERT INTO game_mappings (chzzk_title, steam_appid, skip_steam, skip_igdb, notes)
VALUES
  ('배틀그라운드', 578080, false, false, 'PUBG'),
  ('PUBG', 578080, false, false, 'PUBG'),
  ('엘든 링', 1245620, false, false, 'Elden Ring'),
  ('Elden Ring', 1245620, false, false, 'Elden Ring'),
  ('로스트아크', 1599340, false, false, 'Lost Ark'),
  ('로스트 아크', 1599340, false, false, 'Lost Ark'),
  ('Lost Ark', 1599340, false, false, 'Lost Ark'),
  ('카운터 스트라이크 2', 730, false, false, 'CS2'),
  ('CS2', 730, false, false, 'CS2'),
  ('에이펙스 레전드', 1172470, false, false, 'Apex'),
  ('Apex Legends', 1172470, false, false, 'Apex'),
  ('스타듀 밸리', 413150, false, false, 'Stardew Valley'),
  ('GTA 5', 271590, false, false, 'GTA V'),
  ('GTA V', 271590, false, false, 'GTA V')
ON CONFLICT (chzzk_title) DO NOTHING;
