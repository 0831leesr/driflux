-- ============================================
-- streams.chzzk_channel_id UNIQUE 제약 추가
-- ============================================
-- discover-top-games, update-streams의 upsert(onConflict: chzzk_channel_id) 동작을 위해 필요.
-- 기존 중복 데이터가 있으면 UNIQUE 추가 전에 정리합니다.
-- ============================================

-- 1. 중복 확인 (선택: 실행 전 확인용)
-- SELECT chzzk_channel_id, COUNT(*) FROM streams
-- WHERE chzzk_channel_id IS NOT NULL
-- GROUP BY chzzk_channel_id HAVING COUNT(*) > 1;

-- 2. 빈 문자열을 NULL로 정규화 (UNIQUE에서 '' 중복 방지)
UPDATE streams SET chzzk_channel_id = NULL WHERE chzzk_channel_id = '';

-- 3. 중복 제거: chzzk_channel_id별 1건만 유지 (최신 updated_at/last_chzzk_update 기준)
DELETE FROM streams
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY chzzk_channel_id
        ORDER BY
          COALESCE(updated_at, last_chzzk_update, created_at) DESC NULLS LAST,
          id DESC
      ) AS rn
    FROM streams
    WHERE chzzk_channel_id IS NOT NULL
  ) t
  WHERE rn > 1
);

-- 4. UNIQUE 제약 추가 (NULL은 여러 개 허용)
ALTER TABLE streams
DROP CONSTRAINT IF EXISTS unique_streams_chzzk_channel_id;

ALTER TABLE streams
ADD CONSTRAINT unique_streams_chzzk_channel_id UNIQUE (chzzk_channel_id);

-- 참고: PostgreSQL에서 UNIQUE는 NULL을 여러 개 허용함.
--       chzzk_channel_id가 NULL인 행은 중복 가능(legacy 데이터 등).
