-- ============================================
-- Add critic score and Steam review columns to games table
-- ============================================
-- 전문 평론가 점수(메타스코어) 및 스팀 종합 평가 수집용

-- critic_score: IGDB aggregated_rating (100점 만점, 정수)
ALTER TABLE games
ADD COLUMN IF NOT EXISTS critic_score INTEGER;

-- steam_review_desc: 스팀 평가 요약 (예: "Very Positive", "대체로 긍정적")
ALTER TABLE games
ADD COLUMN IF NOT EXISTS steam_review_desc TEXT;

-- steam_positive_ratio: 스팀 긍정 비율 (%)
ALTER TABLE games
ADD COLUMN IF NOT EXISTS steam_positive_ratio INTEGER;

-- steam_total_reviews: 스팀 총 리뷰 수
ALTER TABLE games
ADD COLUMN IF NOT EXISTS steam_total_reviews INTEGER;

COMMENT ON COLUMN games.critic_score IS '전문 평론가 점수 (IGDB aggregated_rating, 100점 만점)';
COMMENT ON COLUMN games.steam_review_desc IS '스팀 평가 요약 (review_score_desc)';
COMMENT ON COLUMN games.steam_positive_ratio IS '스팀 긍정 비율 (%)';
COMMENT ON COLUMN games.steam_total_reviews IS '스팀 총 리뷰 수';
