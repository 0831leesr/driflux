-- discount_expiration 컬럼 제거
-- 할인 정보는 API 갱신 시 업데이트하여 사용 (discount_expiration 미사용)
ALTER TABLE games
DROP COLUMN IF EXISTS discount_expiration;
