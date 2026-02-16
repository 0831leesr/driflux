-- ============================================
-- Add Korean Title to Games Table
-- ============================================
-- This migration adds korean_title field for matching Chzzk stream categories
-- Execute this SQL in Supabase SQL Editor

-- 1. Add korean_title column
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS korean_title TEXT;

-- 2. Create index for faster ILIKE searches
CREATE INDEX IF NOT EXISTS idx_games_korean_title ON games(korean_title);

-- 3. Add comment to column
COMMENT ON COLUMN games.korean_title IS 'Korean title for matching with Chzzk stream categories (e.g., "리그 오브 레전드")';

-- 4. Update some popular games with Korean titles (예시 데이터)
-- 실제 데이터는 수동으로 입력하거나 별도 스크립트로 업데이트하세요

UPDATE games SET korean_title = '엘든 링' WHERE title ILIKE '%elden ring%';
UPDATE games SET korean_title = '사이버펑크 2077' WHERE title ILIKE '%cyberpunk%';
UPDATE games SET korean_title = '발더스 게이트 3' WHERE title ILIKE '%baldur%';
UPDATE games SET korean_title = '할로우 나이트' WHERE title ILIKE '%hollow knight%';
UPDATE games SET korean_title = '세키로' WHERE title ILIKE '%sekiro%';
UPDATE games SET korean_title = '다크 소울 3' WHERE title ILIKE '%dark souls 3%' OR title ILIKE '%dark souls iii%';
UPDATE games SET korean_title = '위처 3' WHERE title ILIKE '%witcher 3%';
UPDATE games SET korean_title = '스타듀 밸리' WHERE title ILIKE '%stardew%';
UPDATE games SET korean_title = '테라리아' WHERE title ILIKE '%terraria%';
UPDATE games SET korean_title = '하데스' WHERE title ILIKE '%hades%';
UPDATE games SET korean_title = '셀레스테' WHERE title ILIKE '%celeste%';
UPDATE games SET korean_title = '포탈 2' WHERE title ILIKE '%portal 2%';
UPDATE games SET korean_title = '하프라이프 2' WHERE title ILIKE '%half-life 2%' OR title ILIKE '%half life 2%';
UPDATE games SET korean_title = 'GTA 5' WHERE title ILIKE '%grand theft auto v%' OR title ILIKE '%gta v%' OR title ILIKE '%gta 5%';
UPDATE games SET korean_title = '레드 데드 리뎀션 2' WHERE title ILIKE '%red dead redemption 2%';

-- 인기 멀티플레이어 게임
UPDATE games SET korean_title = '리그 오브 레전드' WHERE title ILIKE '%league of legends%' OR title ILIKE '%lol%';
UPDATE games SET korean_title = '발로란트' WHERE title ILIKE '%valorant%';
UPDATE games SET korean_title = '오버워치' WHERE title ILIKE '%overwatch%';
UPDATE games SET korean_title = '배틀그라운드' WHERE title ILIKE '%pubg%' OR title ILIKE '%battlegrounds%';
UPDATE games SET korean_title = '카운터 스트라이크' WHERE title ILIKE '%counter-strike%' OR title ILIKE '%cs:go%' OR title ILIKE '%cs2%';
UPDATE games SET korean_title = '마인크래프트' WHERE title ILIKE '%minecraft%';
UPDATE games SET korean_title = '로스트아크' WHERE title ILIKE '%lost ark%';
UPDATE games SET korean_title = '던전 앤 파이터' WHERE title ILIKE '%dungeon%fighter%' OR title ILIKE '%dnf%';
UPDATE games SET korean_title = '피파' WHERE title ILIKE '%fifa%' OR title ILIKE '%fc 2%';
UPDATE games SET korean_title = '스타크래프트' WHERE title ILIKE '%starcraft%';

-- 5. 결과 확인
SELECT id, title, korean_title, steam_appid
FROM games 
WHERE korean_title IS NOT NULL
ORDER BY id;

-- ============================================
-- 매핑 테스트 쿼리
-- ============================================
-- 특정 카테고리로 게임 검색 테스트
-- SELECT id, title, korean_title 
-- FROM games 
-- WHERE korean_title ILIKE '%리그 오브 레전드%' OR title ILIKE '%league of legends%';

-- ============================================
-- 롤백 (주의!)
-- ============================================
-- ALTER TABLE games DROP COLUMN IF EXISTS korean_title;
-- DROP INDEX IF EXISTS idx_games_korean_title;
