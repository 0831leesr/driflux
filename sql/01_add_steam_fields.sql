-- ============================================
-- Steam Integration Schema Updates
-- ============================================

-- 1. steam_appid 타입을 string에서 integer로 변경
-- (기존 데이터가 있다면 먼저 백업하세요)
ALTER TABLE games 
ALTER COLUMN steam_appid TYPE INTEGER USING steam_appid::integer;

-- 2. steam_appid를 UNIQUE로 설정 (중복 방지)
ALTER TABLE games 
ADD CONSTRAINT unique_steam_appid UNIQUE (steam_appid);

-- 3. 가격 정보 컬럼 추가
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS price_krw INTEGER,
ADD COLUMN IF NOT EXISTS original_price_krw INTEGER,
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'KRW',
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_steam_update TIMESTAMP WITH TIME ZONE;

-- 4. 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_games_steam_appid ON games(steam_appid);
CREATE INDEX IF NOT EXISTS idx_games_discount_rate ON games(discount_rate DESC);
CREATE INDEX IF NOT EXISTS idx_games_last_steam_update ON games(last_steam_update);

-- 5. 커버 이미지 URL 컬럼 확장 (Steam 이미지 저장)
-- (이미 존재하면 스킵됨)
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS header_image_url TEXT,
ADD COLUMN IF NOT EXISTS background_image_url TEXT;

-- ============================================
-- 참고: 기존 steam_appid 데이터 마이그레이션이 필요한 경우
-- ============================================
-- UPDATE games 
-- SET steam_appid = NULL 
-- WHERE steam_appid IS NOT NULL AND steam_appid !~ '^[0-9]+$';

-- ============================================
-- 롤백이 필요한 경우 (주의!)
-- ============================================
-- ALTER TABLE games DROP CONSTRAINT IF EXISTS unique_steam_appid;
-- ALTER TABLE games DROP COLUMN IF EXISTS price_krw;
-- ALTER TABLE games DROP COLUMN IF EXISTS original_price_krw;
-- ALTER TABLE games DROP COLUMN IF EXISTS currency;
-- ALTER TABLE games DROP COLUMN IF EXISTS is_free;
-- ALTER TABLE games DROP COLUMN IF EXISTS last_steam_update;
-- ALTER TABLE games DROP COLUMN IF EXISTS header_image_url;
-- ALTER TABLE games DROP COLUMN IF EXISTS background_image_url;
