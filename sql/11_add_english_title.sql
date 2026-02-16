-- Add english_title and platform columns to games table
-- v3.0: english_title - English game name from Chzzk's liveCategory field
-- v2.0: platform - Game platform (steam, non-steam, unknown)

-- Add platform column (if not exists)
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'unknown';

-- Add english_title column (if not exists)
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS english_title TEXT;

-- Add comments
COMMENT ON COLUMN games.platform IS 'Game platform: steam, non-steam, unknown';
COMMENT ON COLUMN games.english_title IS 'English game name from Chzzk liveCategory (used in URLs)';

-- Create indexes for faster searching
CREATE INDEX IF NOT EXISTS idx_games_platform ON games(platform);
CREATE INDEX IF NOT EXISTS idx_games_english_title ON games(english_title);

-- Update existing games with steam_appid to platform='steam'
UPDATE games 
SET platform = 'steam' 
WHERE steam_appid IS NOT NULL 
  AND (platform IS NULL OR platform = 'unknown');

-- Show updated schema
SELECT 
  column_name, 
  data_type, 
  column_default, 
  is_nullable,
  CASE 
    WHEN column_name = 'platform' THEN '✓ v2.0'
    WHEN column_name = 'english_title' THEN '✓ v3.0'
    ELSE ''
  END as version
FROM information_schema.columns
WHERE table_name = 'games'
  AND column_name IN ('title', 'korean_title', 'english_title', 'platform', 'steam_appid')
ORDER BY ordinal_position;
