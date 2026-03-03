-- ============================================
-- hidden_gems_games View
-- ============================================
-- 스트림 5~29개, 시청자 100명 이상인 게임 중
-- Score = (total_viewers / stream_count) * LN(stream_count) 로 꿀잼 점수 계산.
-- fetchHiddenGemsGames()에서 사용 (score 내림차순, 최대 8개).

DROP VIEW IF EXISTS hidden_gems_games;

CREATE VIEW hidden_gems_games AS
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
GROUP BY g.id, g.title, g.korean_title, g.english_title, g.cover_image_url, g.header_image_url
HAVING COUNT(s.id) >= 5
   AND COUNT(s.id) < 30
   AND COALESCE(SUM(s.viewer_count), 0) >= 100;
