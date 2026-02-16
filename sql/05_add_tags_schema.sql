-- ============================================
-- Steam Tags/Genres Schema - Upgrade Existing Tables
-- ============================================
-- This migration adds tag/genre support for Steam games
-- Execute this SQL in Supabase SQL Editor

-- 1. tags 테이블에 slug 컬럼 추가
ALTER TABLE tags 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. 기존 데이터가 있다면 slug 자동 생성 (name을 소문자로 변환하고 공백을 하이픈으로)
UPDATE tags 
SET slug = LOWER(REPLACE(TRIM(name), ' ', '-'))
WHERE slug IS NULL;

-- 3. slug를 NOT NULL & UNIQUE로 설정
ALTER TABLE tags 
ALTER COLUMN slug SET NOT NULL;

ALTER TABLE tags 
ADD CONSTRAINT unique_tags_slug UNIQUE (slug);

-- 4. created_at 컬럼 추가 (없는 경우)
ALTER TABLE tags 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. game_tags 테이블에 created_at 추가 (없는 경우)
ALTER TABLE game_tags 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 6. game_tags의 PRIMARY KEY 설정 확인 (없다면 추가)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'game_tags_pkey'
  ) THEN
    ALTER TABLE game_tags 
    ADD CONSTRAINT game_tags_pkey PRIMARY KEY (game_id, tag_id);
  END IF;
END $$;

-- 7. 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_game_tags_game_id ON game_tags(game_id);
CREATE INDEX IF NOT EXISTS idx_game_tags_tag_id ON game_tags(tag_id);

-- 8. RLS (Row Level Security) 활성화 (읽기 전용 공개)
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_tags ENABLE ROW LEVEL SECURITY;

-- 9. 공개 읽기 정책 추가 (이미 있으면 무시됨)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tags' AND policyname = 'Allow public read access on tags'
  ) THEN
    CREATE POLICY "Allow public read access on tags"
      ON tags FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'game_tags' AND policyname = 'Allow public read access on game_tags'
  ) THEN
    CREATE POLICY "Allow public read access on game_tags"
      ON game_tags FOR SELECT
      USING (true);
  END IF;
END $$;

-- 10. 결과 확인
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('tags', 'game_tags')
ORDER BY table_name, ordinal_position;

-- ============================================
-- 테스트 쿼리 (선택사항)
-- ============================================

-- 게임별 태그 조회
-- SELECT 
--   g.id,
--   g.title,
--   ARRAY_AGG(t.name) as tags
-- FROM games g
-- LEFT JOIN game_tags gt ON g.id = gt.game_id
-- LEFT JOIN tags t ON gt.tag_id = t.id
-- GROUP BY g.id, g.title
-- ORDER BY g.id;

-- 태그별 게임 수 집계
-- SELECT 
--   t.name,
--   t.slug,
--   COUNT(gt.game_id) as game_count
-- FROM tags t
-- LEFT JOIN game_tags gt ON t.id = gt.tag_id
-- GROUP BY t.id, t.name, t.slug
-- ORDER BY game_count DESC;

-- ============================================
-- 롤백 (주의!)
-- ============================================
-- DROP TABLE IF EXISTS game_tags CASCADE;
-- DROP TABLE IF EXISTS tags CASCADE;
