-- ============================================
-- Insert Test Games with Steam App IDs
-- ============================================

-- 기존 게임이 있다면 업데이트, 없으면 삽입
-- (Upsert using ON CONFLICT)

INSERT INTO games (title, steam_appid) VALUES
  ('ELDEN RING', 1245620),
  ('Cyberpunk 2077', 1091500),
  ('Baldur''s Gate 3', 1086940),
  ('Hollow Knight', 367520),
  ('Sekiro: Shadows Die Twice', 814380),
  ('Dark Souls III', 374320),
  ('The Witcher 3: Wild Hunt', 292030),
  ('Stardew Valley', 413150),
  ('Terraria', 105600),
  ('Hades', 1145360),
  ('Celeste', 504230),
  ('Portal 2', 620),
  ('Half-Life 2', 220),
  ('Grand Theft Auto V', 271590),
  ('Red Dead Redemption 2', 1174180)
ON CONFLICT (steam_appid) 
DO UPDATE SET 
  title = EXCLUDED.title;

-- 결과 확인
SELECT id, title, steam_appid 
FROM games 
WHERE steam_appid IS NOT NULL
ORDER BY id;

-- ============================================
-- 기존 게임 업데이트 (이름으로 매칭)
-- ============================================

-- 만약 이미 게임이 있지만 steam_appid가 없는 경우
UPDATE games SET steam_appid = 1245620 WHERE title ILIKE '%elden ring%' AND steam_appid IS NULL;
UPDATE games SET steam_appid = 1091500 WHERE title ILIKE '%cyberpunk%' AND steam_appid IS NULL;
UPDATE games SET steam_appid = 1086940 WHERE title ILIKE '%baldur%' AND steam_appid IS NULL;
UPDATE games SET steam_appid = 367520 WHERE title ILIKE '%hollow knight%' AND steam_appid IS NULL;
UPDATE games SET steam_appid = 1145360 WHERE title ILIKE '%hades%' AND steam_appid IS NULL;
UPDATE games SET steam_appid = 814380 WHERE title ILIKE '%sekiro%' AND steam_appid IS NULL;
UPDATE games SET steam_appid = 374320 WHERE title ILIKE '%dark souls 3%' AND steam_appid IS NULL;
UPDATE games SET steam_appid = 292030 WHERE title ILIKE '%witcher 3%' AND steam_appid IS NULL;
UPDATE games SET steam_appid = 413150 WHERE title ILIKE '%stardew%' AND steam_appid IS NULL;
UPDATE games SET steam_appid = 105600 WHERE title ILIKE '%terraria%' AND steam_appid IS NULL;
