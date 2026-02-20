-- ============================================
-- trending_games View
-- ============================================
-- streams와 games를 조인하여 트렌딩 점수를 계산하는 뷰.
-- fetchTrendingGames()에서 사용: title, korean_title, cover_image_url, stream_count, total_viewers, trend_score
--
-- 실행 순서: 07_fix_streams_schema.sql, 06_add_korean_title.sql 등 이후 실행
--
-- 스키마 정합성:
-- - streams: game_id(FK), stream_category, is_live, updated_at, viewer_count
-- - games: id, title, korean_title, cover_image_url
-- - 참고: streams.game_title 컬럼은 없음. game_id로 조인.
-- ============================================

-- 1. 기존 뷰 삭제 (에러 방지)
DROP VIEW IF EXISTS trending_games;

-- 2. 뷰 생성
--    - streams.game_id로 games와 조인 (streams.game_title 컬럼은 없음)
--    - is_live = true + 최근 30분 이내 갱신된 스트림만 집계
--    - trend_score: (총시청자 - 최다시청*0.5) * LN(스트림수+1.5)
CREATE VIEW trending_games AS
SELECT
    g.title,
    g.korean_title,
    g.cover_image_url,
    COUNT(s.id)::integer AS stream_count,
    COALESCE(SUM(s.viewer_count), 0)::bigint AS total_viewers,
    (
        (COALESCE(SUM(s.viewer_count), 0) - (COALESCE(MAX(s.viewer_count), 0) * 0.5))
        * LN(COUNT(s.id) + 1.5)
    ) AS trend_score
FROM
    games g
JOIN
    streams s ON s.game_id = g.id
WHERE
    s.is_live = true
    AND s.updated_at > NOW() - INTERVAL '30 minutes'
GROUP BY
    g.id,
    g.title,
    g.korean_title,
    g.cover_image_url;

-- (선택) games.created_at이 있는 경우 7일 이내 신규 게임에 1.2x 보너스를 주려면
-- trend_score 식을 아래로 교체하고 GROUP BY에 g.created_at 추가:
--   ( ... ) * CASE WHEN g.created_at > NOW() - INTERVAL '7 days' THEN 1.2 ELSE 1.0 END AS trend_score
