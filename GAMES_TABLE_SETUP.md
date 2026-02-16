# Games Table Setup for Chzzk Integration

## 개요
치지직 인기 게임 데이터를 `games` 테이블에 자동으로 저장하는 시스템

## 구현된 기능

### 1. 게임 통계 수집
- **총 시청자수** (`total_viewers`): 해당 게임의 모든 스트림 시청자 수 합계
- **인기 순위** (`popularity_rank`): 시청자 수 기준 인기 순위 (1위, 2위, ...)
- **마지막 업데이트** (`last_popularity_update`): 통계 업데이트 시간

### 2. 자동 게임 생성
- 치지직에서 발견된 게임이 DB에 없으면 자동으로 생성
- `title`, `korean_title`, `slug` 자동 설정

### 3. 인기 순서 유지
- 시청자 수가 많은 게임부터 순서대로 저장
- `popularity_rank`로 순위 관리

## 데이터베이스 스키마

### games 테이블 추가 컬럼

```sql
total_viewers BIGINT DEFAULT 0
  -- 해당 게임의 전체 라이브 스트림 시청자 수 합계

popularity_rank INTEGER
  -- 인기 순위 (1 = 가장 인기, 2 = 두 번째, ...)

last_popularity_update TIMESTAMPTZ
  -- 마지막 통계 업데이트 시간

slug TEXT UNIQUE
  -- URL용 슬러그 (예: "league-of-legends")
```

## 실행 순서

### Step 1: DB 준비 (games 초기화)

Supabase SQL Editor에서 `sql/08_prepare_games_table.sql` 실행:

```sql
DELETE FROM game_tags;
DELETE FROM games;
ALTER SEQUENCE games_id_seq RESTART WITH 1;

ALTER TABLE games ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS total_viewers BIGINT DEFAULT 0;
ALTER TABLE games ADD COLUMN IF NOT EXISTS popularity_rank INTEGER;
ALTER TABLE games ADD CONSTRAINT unique_games_slug UNIQUE (slug);
```

### Step 2: 서버 재시작

```powershell
npm run dev
```

### Step 3: API 실행

```bash
# 상위 20개 인기 게임 수집
http://localhost:3000/api/cron/discover-top-games?size=20
```

### Step 4: 결과 확인

```sql
-- 인기 순위로 게임 목록 확인
SELECT 
  id,
  title,
  korean_title,
  popularity_rank,
  total_viewers,
  last_popularity_update
FROM games
ORDER BY popularity_rank
LIMIT 20;
```

**예상 결과**:
```
id | title              | popularity_rank | total_viewers
---|--------------------|-----------------|---------------
1  | 리그 오브 레전드      | 1               | 25000
2  | 마인크래프트         | 2               | 18500
3  | 로스트아크          | 3               | 12300
4  | 발로란트            | 4               | 9800
...
```

## 동작 방식

```
1. 치지직에서 인기 게임 카테고리 가져오기 (30개)
   ↓
2. 각 게임별로 스트림 검색 (최대 20개씩)
   ↓
3. 게임별 통계 계산:
   - 스트림 수
   - 총 시청자수 (모든 스트림 합계)
   ↓
4. 시청자수 순으로 정렬
   ↓
5. games 테이블에 순위와 함께 저장
   - popularity_rank: 1, 2, 3, ...
   - total_viewers: 25000, 18500, ...
   ↓
6. streams 테이블에 스트림 저장
   - game_id 자동 매핑
```

## 예상 콘솔 로그

```
[Top Games Discovery] STEP A: Calculating game statistics
[Top Games Discovery] Found 15 unique game categories
[Top Games Discovery] Top 5 by viewers:
  1. 리그 오브 레전드: 45 streams, 25000 viewers
  2. 마인크래프트: 38 streams, 18500 viewers
  3. 로스트아크: 25 streams, 12300 viewers
  4. 발로란트: 20 streams, 9800 viewers
  5. 오버워치: 18 streams, 8200 viewers

[Top Games Discovery] STEP A2: Saving games to database
[Top Games Discovery] Saving game #1: "리그 오브 레전드"
[Top Games Discovery] ✓ Game saved: "리그 오브 레전드" (ID: 1, Rank: 1, Viewers: 25000)
[Top Games Discovery] Saving game #2: "마인크래프트"
[Top Games Discovery] ✓ Game saved: "마인크래프트" (ID: 2, Rank: 2, Viewers: 18500)

[Top Games Discovery] STEP B: Saving streams to database
[Top Games Discovery] ✓✓✓ WRITE SUCCESSFUL ✓✓✓
```

## API 파라미터

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `size` | number | 50 | 저장할 스트림 수 |

**예시**:
```bash
# 상위 20개 인기 게임
http://localhost:3000/api/cron/discover-top-games?size=20

# 상위 100개 (더 많은 데이터)
http://localhost:3000/api/cron/discover-top-games?size=100

# 상위 10개 (빠른 테스트)
http://localhost:3000/api/cron/discover-top-games?size=10
```

## 활용 방법

### 프론트엔드에서 인기 게임 표시

```sql
-- 인기 순위 TOP 10
SELECT 
  id,
  title,
  korean_title,
  popularity_rank,
  total_viewers
FROM games
WHERE popularity_rank IS NOT NULL
ORDER BY popularity_rank
LIMIT 10;
```

### 게임별 라이브 스트림 수

```sql
-- 각 게임의 현재 라이브 스트림 수
SELECT 
  g.title,
  g.total_viewers,
  COUNT(s.id) as current_live_streams,
  SUM(s.viewer_count) as current_viewers
FROM games g
LEFT JOIN streams s ON g.id = s.game_id AND s.is_live = true
GROUP BY g.id, g.title, g.total_viewers
ORDER BY g.popularity_rank
LIMIT 20;
```

### 시청자 증가율 분석

```sql
-- 게임 통계 히스토리 (시간대별 비교)
SELECT 
  title,
  total_viewers,
  last_popularity_update,
  LAG(total_viewers) OVER (PARTITION BY id ORDER BY last_popularity_update) as prev_viewers
FROM games
WHERE popularity_rank IS NOT NULL
ORDER BY popularity_rank;
```

## 자동 업데이트 설정

### Vercel Cron (권장)

```json
{
  "crons": [
    {
      "path": "/api/cron/discover-top-games?size=100",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

- **10분마다** 실행
- 상위 **100개** 스트림 수집
- 게임 통계 자동 업데이트

## 관련 파일

- `sql/08_prepare_games_table.sql` - DB 준비 스크립트
- `app/api/cron/discover-top-games/route.ts` - 메인 API
- `GAMES_TABLE_SETUP.md` (현재 문서)

## 버전 히스토리

- **v1.0** (2026-02-15): 초기 구현
  - 게임 통계 자동 수집
  - 인기 순위 관리
  - 총 시청자수 계산
