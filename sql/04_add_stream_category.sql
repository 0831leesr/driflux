-- =============================================
-- Add Stream Category Field to Streams Table
-- =============================================
-- This migration adds a field for storing the game/category name
-- Execute this SQL in Supabase SQL Editor

-- Add stream_category column (stores game/category name from Chzzk)
ALTER TABLE streams 
ADD COLUMN IF NOT EXISTS stream_category TEXT;

-- Create index for filtering by category
CREATE INDEX IF NOT EXISTS idx_streams_stream_category 
ON streams(stream_category) 
WHERE stream_category IS NOT NULL;

-- Add comment to column
COMMENT ON COLUMN streams.stream_category IS 'Game or category name from Chzzk (e.g., "League of Legends", "Valorant")';

-- =============================================
-- Example Usage
-- =============================================
-- Query streams by category:
-- SELECT * FROM streams WHERE stream_category = 'League of Legends' AND is_live = true;

-- Get popular categories:
-- SELECT stream_category, COUNT(*) as stream_count, SUM(viewer_count) as total_viewers
-- FROM streams 
-- WHERE is_live = true AND stream_category IS NOT NULL
-- GROUP BY stream_category
-- ORDER BY total_viewers DESC;
