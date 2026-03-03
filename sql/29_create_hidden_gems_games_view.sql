-- ============================================
-- hidden_gems_games View
-- ============================================
-- 트렌딩 게임(첫 번째 섹션)에 선정되지 않은 게임만 포함.
-- Score = (total_viewers / stream_count) * LN(stream_count) 로 꿀잼 점수 계산.
-- fetchHiddenGemsGames()에서 사용 (score 내림차순, 최대 8개).

DROP VIEW IF EXISTS hidden_gems_games;

CREATE VIEW hidden_gems_games AS
WITH trending_top AS (
    -- trending_games와 동일한 조건으로 상위 8개 게임 ID 추출
    SELECT g.id
    FROM games g
    JOIN streams s ON s.game_id = g.id
    WHERE s.is_live = true
      AND s.updated_at > NOW() - INTERVAL '30 minutes'
    GROUP BY g.id, g.title, g.korean_title, g.cover_image_url
    ORDER BY (
        (COALESCE(SUM(s.viewer_count), 0) - (COALESCE(MAX(s.viewer_count), 0) * 0.5))
        * LN(COUNT(s.id) + 1.5)
    ) DESC
    LIMIT 8
)
SELECT
    g.id,
    g.title,
    g.korean_title,
    g.english_title,
    g.cover_image_url,
    g.header_image_url,
    COUNT(s.id)::integer AS stream_count,
    COALESCE(SUM(s.viewer_count), 0)::bigint AS total_viewers,
    (
        (COALESCE(SUM(s.viewer_count), 0)::float / NULLIF(COUNT(s.id), 0))
        * LN(COUNT(s.id))
    ) AS score
FROM games g
JOIN streams s ON s.game_id = g.id
WHERE s.is_live = true
  AND g.id NOT IN (SELECT id FROM trending_top)
GROUP BY g.id, g.title, g.korean_title, g.english_title, g.cover_image_url, g.header_image_url;
