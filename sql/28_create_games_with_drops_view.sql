-- ============================================
-- games_with_drops View
-- ============================================
-- has_drops=true인 라이브 스트림이 하나라도 있는 게임 목록.
-- fetchGamesWithDrops()에서 사용 (total_viewers 내림차순, 최대 4개).

DROP VIEW IF EXISTS games_with_drops;

CREATE VIEW games_with_drops AS
SELECT
    g.id,
    g.title,
    g.korean_title,
    g.english_title,
    g.cover_image_url,
    g.header_image_url,
    g.total_viewers
FROM games g
WHERE EXISTS (
    SELECT 1 FROM streams s
    WHERE s.game_id = g.id
      AND s.has_drops = true
      AND s.is_live = true
);
