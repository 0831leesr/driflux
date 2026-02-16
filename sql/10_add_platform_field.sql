-- Add platform field to games table
-- This field indicates which platform the game is available on

-- Add platform column
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'unknown';

-- Add comment
COMMENT ON COLUMN games.platform IS 'Game platform: steam, epic, riot, nexon, mobile, unknown, etc.';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_games_platform ON games(platform);

-- Update existing games
UPDATE games 
SET platform = 'steam' 
WHERE steam_appid IS NOT NULL;

UPDATE games
SET platform = 'unknown'
WHERE steam_appid IS NULL AND platform = 'unknown';

-- Show updated schema
SELECT 
  column_name, 
  data_type, 
  column_default, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'games'
ORDER BY ordinal_position;
