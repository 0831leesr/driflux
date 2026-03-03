-- games.discount_expiration 추가
-- Steam storesearch API에서 할인 종료 시각(Unix timestamp)을 저장
-- 표시 시 만료된 할인은 discount_rate=0으로 취급
ALTER TABLE games
ADD COLUMN IF NOT EXISTS discount_expiration BIGINT;

COMMENT ON COLUMN games.discount_expiration IS '할인 종료 시각 (Unix timestamp), null이면 만료 체크 안 함';
