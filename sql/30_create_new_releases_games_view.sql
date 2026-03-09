-- ============================================
-- new_releases_games View
-- ============================================
-- 최근 30일 이내 출시(release_date) + 라이브 스트림 있는 게임.
-- Score = total_viewers * (1 / SQRT(경과일수 + 1))
-- fetchNewReleasesGames()에서 사용 (score 내림차순, 최대 8개).

DROP VIEW IF EXISTS new_releases_games;

CREATE VIEW new_releases_games AS
SELECT
    g.id,
    g.title,
    g.korean_title,
    g.english_title,
    g.cover_image_url,
    g.header_image_url,
    g.release_date,
    (CURRENT_DATE - g.release_date)::integer AS days_elapsed,
    COUNT(s.id)::integer AS stream_count,
    COALESCE(SUM(s.viewer_count), 0)::bigint AS total_viewers,
    (
        COALESCE(SUM(s.viewer_count), 0)::float
        * (1.0 / SQRT((CURRENT_DATE - g.release_date)::float + 1))
    ) AS score
FROM games g
JOIN streams s ON s.game_id = g.id
WHERE s.is_live = true
  AND g.release_date IS NOT NULL
  AND g.release_date >= CURRENT_DATE - INTERVAL '30 days'
  AND g.release_date <= CURRENT_DATE
GROUP BY g.id, g.title, g.korean_title, g.english_title, g.cover_image_url, g.header_image_url, g.release_date;
