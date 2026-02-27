-- streams.has_drops: 치지직 드롭스 활성화 여부
-- dropsCampaignNo가 있으면 true (시청 시 드롭스 아이템 획득 가능)

ALTER TABLE streams
ADD COLUMN IF NOT EXISTS has_drops BOOLEAN DEFAULT false;

COMMENT ON COLUMN streams.has_drops IS 'Chzzk drops enabled (dropsCampaignNo present)';
