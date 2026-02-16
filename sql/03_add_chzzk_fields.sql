-- =============================================
-- Add Chzzk Integration Fields to Streams Table
-- =============================================
-- This migration adds fields for Chzzk live streaming integration
-- Execute this SQL in Supabase SQL Editor

-- Add chzzk_channel_id column (stores Chzzk channel unique ID)
ALTER TABLE streams 
ADD COLUMN IF NOT EXISTS chzzk_channel_id TEXT;

-- Add is_live column (stores current live status)
ALTER TABLE streams 
ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false;

-- Add viewer_count column (stores current concurrent viewers)
ALTER TABLE streams 
ADD COLUMN IF NOT EXISTS viewer_count INTEGER DEFAULT 0;

-- Add last_chzzk_update column (stores last API update timestamp)
ALTER TABLE streams 
ADD COLUMN IF NOT EXISTS last_chzzk_update TIMESTAMPTZ;

-- Create index on chzzk_channel_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_streams_chzzk_channel_id 
ON streams(chzzk_channel_id) 
WHERE chzzk_channel_id IS NOT NULL;

-- Create index on is_live for filtering live streams
CREATE INDEX IF NOT EXISTS idx_streams_is_live 
ON streams(is_live) 
WHERE is_live = true;

-- Add comment to table
COMMENT ON COLUMN streams.chzzk_channel_id IS 'Chzzk channel unique ID (e.g., "c123abc456def")';
COMMENT ON COLUMN streams.is_live IS 'Current live streaming status';
COMMENT ON COLUMN streams.viewer_count IS 'Current concurrent viewer count';
COMMENT ON COLUMN streams.last_chzzk_update IS 'Last time Chzzk data was updated';

-- =============================================
-- Example Test Data (Optional)
-- =============================================
-- Uncomment to insert test data for popular Korean streamers

-- UPDATE streams SET chzzk_channel_id = 'c1f0a24755fb3e583fb0a588f921c84b' WHERE title = '한동숙';  -- 한동숙 (HandongSook)
-- UPDATE streams SET chzzk_channel_id = 'eb4dbcb2e538c5345e7c3f48c849518d' WHERE title = '풍월량';  -- 풍월량 (PungwolRyang)
-- UPDATE streams SET chzzk_channel_id = 'd6cc0b2c6b0d86fb6d0c5e1b8c8f3f3e' WHERE title = '괴물쥐';  -- 괴물쥐 (GoemuljuI)
