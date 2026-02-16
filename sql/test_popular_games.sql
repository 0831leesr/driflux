-- ============================================
-- 인기 게임 한글 제목 추가 및 테스트
-- ============================================

-- 1. 현재 게임 목록 확인
SELECT id, title, korean_title, steam_appid
FROM games
ORDER BY id
LIMIT 20;

-- 2. 실시간 방송이 많은 인기 게임 한글 제목 추가
-- (이미 있을 수 있으니 중복 실행해도 안전합니다)

-- 리그 오브 레전드 (가장 인기)
INSERT INTO games (title, korean_title)
VALUES ('League of Legends', '리그 오브 레전드')
ON CONFLICT (title) DO UPDATE SET korean_title = EXCLUDED.korean_title;

-- 발로란트
INSERT INTO games (title, korean_title)
VALUES ('VALORANT', '발로란트')
ON CONFLICT (title) DO UPDATE SET korean_title = EXCLUDED.korean_title;

-- 마인크래프트
INSERT INTO games (title, korean_title)
VALUES ('Minecraft', '마인크래프트')
ON CONFLICT (title) DO UPDATE SET korean_title = EXCLUDED.korean_title;

-- 오버워치 2
INSERT INTO games (title, korean_title)
VALUES ('Overwatch 2', '오버워치')
ON CONFLICT (title) DO UPDATE SET korean_title = EXCLUDED.korean_title;

-- 로스트아크
INSERT INTO games (title, korean_title)
VALUES ('Lost Ark', '로스트아크')
ON CONFLICT (title) DO UPDATE SET korean_title = EXCLUDED.korean_title;

-- 스타크래프트
INSERT INTO games (title, korean_title)
VALUES ('StarCraft', '스타크래프트')
ON CONFLICT (title) DO UPDATE SET korean_title = EXCLUDED.korean_title;

-- 배틀그라운드
INSERT INTO games (title, korean_title)
VALUES ('PUBG: BATTLEGROUNDS', '배틀그라운드')
ON CONFLICT (title) DO UPDATE SET korean_title = EXCLUDED.korean_title;

-- 3. 업데이트된 게임 확인
SELECT id, title, korean_title
FROM games
WHERE korean_title IS NOT NULL
ORDER BY id;

-- 4. 특정 게임 ID로 테스트하기
-- 위 결과에서 "리그 오브 레전드"나 "마인크래프트"의 ID를 확인하고
-- 브라우저에서 다음과 같이 테스트:
-- http://localhost:3000/api/cron/update-streams?gameId={게임ID}
