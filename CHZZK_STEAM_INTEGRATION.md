# Chzzk + Steam Integration Guide

## 개요
치지직에서 인기 게임을 발견하고, 자동으로 스팀 정보를 가져와 DB에 저장하는 통합 시스템

## 통합 플로우

```
1. 치지직 인기 게임 발견
   - 인기 카테고리 (30개) 가져오기
   - "게임" 카테고리만 필터링
   - 시청자수 기준 정렬
   ↓
2. Games 테이블에 기본 정보 저장
   - title: "리그 오브 레전드"
   - korean_title: "리그 오브 레전드"
   - total_viewers: 25000
   - popularity_rank: 1
   ↓
3. 스팀에서 게임 검색
   - 게임 이름으로 검색
   - Steam AppID 획득
   ↓
4. 스팀 상세 정보 가져오기
   - AppID로 게임 상세 정보 조회
   - 이미지, 가격, 태그 등
   ↓
5. Games 테이블 업데이트
   - steam_appid: 1091500
   - cover_image_url: "https://..."
   - price_krw: 64800
   - top_tags: ["Action", "RPG", "Open World", ...]
   ↓
6. Streams 테이블에 스트림 저장
   - game_id 자동 매핑
```

## 데이터베이스 스키마

### games 테이블 - 새로운 컬럼

```sql
-- 치지직 정보
total_viewers BIGINT DEFAULT 0
  -- 현재 해당 게임을 방송하는 모든 스트림의 시청자 수 합계

popularity_rank INTEGER
  -- 인기 순위 (1 = 가장 인기있는 게임)

last_popularity_update TIMESTAMPTZ
  -- 마지막 인기도 업데이트 시간

-- 스팀 정보 (기존 컬럼들)
steam_appid INTEGER
  -- 스팀 게임 ID

cover_image_url TEXT
  -- 게임 커버 이미지

price_krw INTEGER
  -- 한국 원화 가격

top_tags TEXT[]
  -- 스팀에서 가져온 상위 5개 태그
```

## 설치 및 실행

### Step 1: SQL 실행

#### 1-1. games 테이블 초기화 (선택사항)

```bash
# Supabase SQL Editor에서 실행
sql/08_prepare_games_table.sql
```

- games 테이블 초기화
- 필수 컬럼 추가 (slug, total_viewers, popularity_rank)

#### 1-2. top_tags 컬럼 추가

```bash
# Supabase SQL Editor에서 실행
sql/09_add_steam_info_columns.sql
```

- `top_tags TEXT[]` 컬럼 추가
- GIN 인덱스 생성 (태그 검색 최적화)

### Step 2: 서버 재시작

```powershell
npm run dev
```

### Step 3: API 실행

```bash
# 상위 20개 게임 수집 + 스팀 정보 자동 가져오기
http://localhost:3000/api/cron/discover-top-games?size=20
```

**예상 실행 시간**: 약 3-5분
- 치지직 API: 30초
- 스팀 검색 + 상세 정보: 게임당 3초 × 20개 = 1분
- 스트림 저장: 1-2분

### Step 4: 결과 확인

```sql
-- 인기 게임 목록 (스팀 정보 포함)
SELECT 
  id,
  title,
  korean_title,
  popularity_rank,
  total_viewers,
  steam_appid,
  price_krw,
  top_tags,
  cover_image_url
FROM games
WHERE steam_appid IS NOT NULL
ORDER BY popularity_rank
LIMIT 20;
```

**예상 결과**:

| id | title | popularity_rank | total_viewers | steam_appid | price_krw | top_tags |
|----|-------|-----------------|---------------|-------------|-----------|----------|
| 1 | 리그 오브 레전드 | 1 | 25000 | 0 | 0 | ["Free to Play", "MOBA"] |
| 2 | 마인크래프트 | 2 | 18500 | 1091500 | 32000 | ["Sandbox", "Survival", "Multiplayer"] |
| 3 | 로스트아크 | 3 | 12300 | 1599340 | 0 | ["Free to Play", "MMORPG", "Action"] |

## 콘솔 로그 예시

```
[Top Games Discovery] STEP A: Calculating game statistics
[Top Games Discovery] Found 15 unique game categories
[Top Games Discovery] Top 5 by viewers:
  1. 리그 오브 레전드: 45 streams, 25000 viewers
  2. 마인크래프트: 38 streams, 18500 viewers
  3. 로스트아크: 25 streams, 12300 viewers

[Top Games Discovery] STEP A2: Saving games to database
[Top Games Discovery] Saving game #1: "리그 오브 레전드"
[Top Games Discovery] ✓ Game saved (ID: 1, Rank: 1, Viewers: 25000)

[Top Games Discovery] STEP A3: Fetching Steam information
[Top Games Discovery] Searching Steam for: "리그 오브 레전드"
[Steam Search] Searching for: "리그 오브 레전드"
[Steam Search] ✓ Found 3 results
[Steam Search] Top result: League of Legends (appid: 0)
[Top Games Discovery] ✓ Found Steam appid: 0
[Steam API] Fetching app 0...
[Top Games Discovery] Processing Steam data for "리그 오브 레전드":
  - AppID: 0
  - Title: League of Legends
  - Price: Free
  - Tags: Free to Play, MOBA, Multiplayer
[Top Games Discovery] ✓ Updated game with Steam info

[Top Games Discovery] Steam update summary:
  - Successfully updated: 12
  - Not found/failed: 3
```

## API 파라미터

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `size` | number | 50 | 수집할 스트림 수 (게임 수 아님!) |

**예시**:
```bash
# 빠른 테스트 (10개 스트림)
http://localhost:3000/api/cron/discover-top-games?size=10

# 기본 (50개 스트림)
http://localhost:3000/api/cron/discover-top-games?size=50

# 대량 수집 (200개 스트림)
http://localhost:3000/api/cron/discover-top-games?size=200
```

## 주요 기능

### 1. 자동 게임 검색
- 치지직 게임 이름 → 스팀 검색
- 가장 적합한 결과 자동 선택
- 한글 이름으로도 검색 가능

### 2. 스팀 정보 자동 업데이트
- **steam_appid**: 스팀 게임 ID
- **cover_image_url**: 게임 커버 이미지
- **price_krw**: 한국 원화 가격
- **top_tags**: 상위 5개 태그
- **is_free**: 무료 게임 여부
- **discount_rate**: 할인율

### 3. Rate Limiting
- 스팀 API 호출 간 1.5초 대기
- 안정적인 데이터 수집

## 활용 사례

### 프론트엔드: 게임 카드 표시

```typescript
// 인기 게임 목록 가져오기
const { data: games } = await supabase
  .from('games')
  .select('*')
  .not('steam_appid', 'is', null)
  .order('popularity_rank')
  .limit(20)

// 게임 카드 렌더링
games?.map(game => (
  <GameCard
    title={game.title}
    image={game.cover_image_url}
    price={game.price_krw}
    tags={game.top_tags}
    viewers={game.total_viewers}
  />
))
```

### 태그 기반 게임 검색

```sql
-- "RPG" 태그가 있는 인기 게임
SELECT *
FROM games
WHERE 'RPG' = ANY(top_tags)
  AND steam_appid IS NOT NULL
ORDER BY total_viewers DESC
LIMIT 10;
```

### 가격대별 게임 필터

```sql
-- 3만원 이하 인기 게임
SELECT 
  title,
  price_krw,
  total_viewers,
  top_tags
FROM games
WHERE price_krw <= 30000
  AND steam_appid IS NOT NULL
ORDER BY popularity_rank
LIMIT 20;
```

### 무료 게임만 보기

```sql
SELECT *
FROM games
WHERE is_free = true
  AND steam_appid IS NOT NULL
ORDER BY total_viewers DESC;
```

## 문제 해결

### 스팀 정보가 업데이트되지 않음

**원인**: 스팀 검색에서 게임을 찾지 못함

**해결**:
1. 터미널 로그에서 `[Steam Search]` 확인
2. "No results found" 메시지 확인
3. 게임 이름이 스팀과 다를 수 있음 (예: "배틀그라운드" vs "PUBG")

**수동 업데이트**:
```sql
-- 수동으로 steam_appid 설정
UPDATE games
SET steam_appid = 578080  -- PUBG의 실제 appid
WHERE title = '배틀그라운드';
```

### Rate Limit 에러

**증상**: `[Steam API] HTTP Error: 429`

**해결**: `lib/steam.ts`에서 `RATE_LIMIT_DELAY` 증가
```typescript
const RATE_LIMIT_DELAY = 2000 // 1.5초 → 2초로 증가
```

### 일부 게임만 업데이트됨

**정상 동작**: 모든 게임이 스팀에 있는 것은 아님
- 리그 오브 레전드: 스팀에 없음 (라이엇 게임즈 독자 플랫폼)
- 던전앤파이터: 넥슨 게임, 스팀에 없음

**확인**:
```sql
-- 스팀 정보가 있는 게임 수
SELECT COUNT(*) FROM games WHERE steam_appid IS NOT NULL;

-- 스팀 정보가 없는 게임 목록
SELECT title, korean_title, total_viewers
FROM games
WHERE steam_appid IS NULL
ORDER BY popularity_rank;
```

## 자동화 설정

### Vercel Cron

`vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/discover-top-games?size=100",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

- **6시간마다** 실행
- 상위 **100개** 스트림 수집
- 게임 정보 + 스팀 정보 자동 업데이트

## 성능 고려사항

### API 호출 시간

- **치지직 API**: 30초 ~ 1분
- **스팀 검색 API**: 게임당 1초
- **스팀 상세 API**: 게임당 2초
- **총 예상 시간**: 게임 수 × 3초 + 1분

**예시**:
- 10개 게임: ~1.5분
- 20개 게임: ~2분
- 50개 게임: ~4분

### 최적화 팁

1. **size 파라미터 조절**: 필요한 만큼만 수집
2. **캐싱**: 스팀 정보는 자주 변하지 않으므로, 기존에 steam_appid가 있으면 스킵 가능
3. **병렬 처리**: 스트림 저장은 병렬 처리 고려 (현재는 순차 처리)

## 관련 파일

- `sql/08_prepare_games_table.sql` - games 테이블 준비
- `sql/09_add_steam_info_columns.sql` - top_tags 컬럼 추가
- `lib/steam.ts` - 스팀 API 통합
- `app/api/cron/discover-top-games/route.ts` - 메인 API
- `CHZZK_STEAM_INTEGRATION.md` (현재 문서)

## 버전 히스토리

- **v1.0** (2026-02-15): 치지직 + 스팀 통합
  - 자동 게임 검색
  - 스팀 정보 자동 수집
  - 상위 5개 태그 저장
  - 가격, 이미지, 할인 정보
