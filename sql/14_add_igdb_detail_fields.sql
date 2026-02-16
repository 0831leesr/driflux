-- ============================================
-- Add IGDB-derived detail fields to games table
-- ============================================
-- Used for non-Steam games (LoL, Valorant, etc.) when metadata is from IGDB.

-- short_description: 게임 설명 (IGDB summary)
ALTER TABLE games
ADD COLUMN IF NOT EXISTS short_description TEXT;

-- developer: 개발사 (IGDB involved_companies)
ALTER TABLE games
ADD COLUMN IF NOT EXISTS developer TEXT;

-- publisher: 배급사 (IGDB involved_companies)
ALTER TABLE games
ADD COLUMN IF NOT EXISTS publisher TEXT;

COMMENT ON COLUMN games.short_description IS 'Game description (from Steam or IGDB summary)';
COMMENT ON COLUMN games.developer IS 'Developer company name (from Steam or IGDB)';
COMMENT ON COLUMN games.publisher IS 'Publisher company name (from Steam or IGDB)';
