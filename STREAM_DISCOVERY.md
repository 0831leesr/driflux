# Stream Discovery System - Game-Based Live Stream Crawler

## 개요
게임별로 치지직(Chzzk) 실시간 방송을 자동으로 탐색하고 DB에 저장하는 시스템입니다. 기존의 "등록된 스트림 업데이트" 방식에서 **"게임 기반 자동 발견(Discovery)"** 방식으로 전환되었습니다.

## 주요 변경사항

### Before (기존 방식)
```
DB에 등록된 스트림 → 개별 채널 API 호출 → 상태 업데이트
```
- **문제점**: 
  - 새로운 방송을 발견할 수 없음
  - 수동으로 스트림을 먼저 등록해야 함
  - 채널 ID를 미리 알아야 함

### After (새로운 방식)
```
DB의 게임 목록 → 게임별 치지직 검색 → 방송 발견 → Upsert
```
- **장점**:
  - 새로운 방송 자동 발견
  - 실시간 인기 방송 수집
  - 게임만 등록하면 자동으로 스트림 수집

## 시스템 구조

### 1. 치지직 검색 API (`lib/chzzk.ts`)

#### 새로운 타입 정의
```typescript
// 검색 결과 개별 아이템
interface ChzzkSearchLiveItem {
  channel: {
    channelId: string
    channelName: string
    channelImageUrl: string
    verifiedMark: boolean
  }
  liveTitle: string
  liveImageUrl: string
  concurrentUserCount: number
  openDate: string
  liveCategoryValue: string | null
  // ...
}

// 검색 API 응답
interface ChzzkSearchResponse {
  code: number
  message: string | null
  content: {
    size: number
    data: ChzzkSearchLiveItem[]
  } | null
}

// 처리된 스트림 데이터
interface SearchedStreamData {
  channelId: string
  channelName: string
  liveTitle: string
  liveImageUrl: string
  concurrentUserCount: number
  openDate: string
  category?: string | null
}
```

#### 새로운 함수: `searchChzzkLives()`

**API 엔드포인트**:
```
GET https://api.chzzk.naver.com/service/v1/search/lives?keyword={keyword}&size={size}&offset=0
```

**사용 예시**:
```typescript
const streams = await searchChzzkLives("리그 오브 레전드", 20)
// Returns: SearchedStreamData[] (최대 20개)
```

**기능**:
- 키워드로 치지직 실시간 방송 검색
- 썸네일 URL 자동 변환 (`{type}` → `720`)
- 상세한 로그 출력 (디버깅용)
- 에러 발생 시 빈 배열 반환 (안전)

### 2. 스트림 탐색 API (`app/api/cron/update-streams/route.ts`)

#### 전체 로직 흐름

```
1. games 테이블에서 게임 목록 가져오기
   ↓
2. 각 게임에 대해 치지직 검색 (korean_title 우선)
   ↓
3. 검색된 방송 데이터 처리
   ├─ 기존 스트림 → UPDATE
   └─ 새 스트림 → INSERT
   ↓
4. 검색 결과에 없는 기존 스트림 → is_live = false
   ↓
5. 통계 및 결과 반환
```

#### Upsert 로직

```typescript
// 1. 채널 ID로 기존 스트림 확인
const existingStream = await db.select()
  .where(chzzk_channel_id = channelId)

if (existingStream) {
  // 2a. 기존 스트림 업데이트
  await db.update(streams)
    .set({ 
      title, 
      viewer_count, 
      is_live: true,
      game_id,
      // ...
    })
} else {
  // 2b. 새 스트림 추가
  await db.insert(streams)
    .values({ 
      chzzk_channel_id,
      title,
      streamer_name,
      game_id,
      is_live: true,
      // ...
    })
}
```

#### 오프라인 스트림 처리

```sql
-- 현재 검색에서 발견되지 않은 스트림을 오프라인으로 표시
UPDATE streams
SET 
  is_live = false,
  viewer_count = 0,
  last_chzzk_update = NOW()
WHERE 
  is_live = true 
  AND chzzk_channel_id NOT IN (현재 검색된 채널 ID들)
```

## API 사용법

### 엔드포인트
```
GET /api/cron/update-streams
```

### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `limit` | number | 처리할 게임 수 제한 | `?limit=5` |
| `gameId` | number | 특정 게임만 처리 | `?gameId=42` |

### 요청 예시

```bash
# 모든 게임 처리
curl http://localhost:3000/api/cron/update-streams

# 처음 5개 게임만 처리
curl http://localhost:3000/api/cron/update-streams?limit=5

# 특정 게임만 처리
curl http://localhost:3000/api/cron/update-streams?gameId=42
```

### 응답 예시

```json
{
  "success": true,
  "message": "Processed 10 games, found 45 streams (12 new, 33 updated)",
  "stats": {
    "gamesProcessed": 10,
    "gamesWithStreams": 8,
    "streamsFound": 45,
    "streamsCreated": 12,
    "streamsUpdated": 33,
    "streamsFailed": 0,
    "gameDetails": [
      {
        "gameId": 42,
        "gameTitle": "League of Legends",
        "searchKeyword": "리그 오브 레전드",
        "streamsFound": 15,
        "status": "success"
      },
      // ...
    ]
  },
  "duration": 45230
}
```

## 콘솔 로그 예시

### 성공적인 탐색
```
[Stream Discovery] Starting game-based stream discovery job...
[Stream Discovery] ✓ Admin client initialized
[Stream Discovery] Found 10 games to search

[Stream Discovery] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Stream Discovery] Processing game 42: League of Legends
[Stream Discovery] Search keyword: "리그 오브 레전드"

[Chzzk Search] ========================================
[Chzzk Search] Searching for: "리그 오브 레전드"
[Chzzk Search] ✓ Found 15 live streams
[Chzzk Search]   1. 페이커 - 솔랭 (50,234 viewers)
[Chzzk Search]   2. 젠지 - 스크림 (12,345 viewers)
[Chzzk Search]   ...
[Chzzk Search] ========================================

[Stream Discovery] Found 15 streams for "리그 오브 레전드"
[Stream Discovery] ✓ Updated: 페이커 - 솔랭
[Stream Discovery] ✓ Created: 젠지 - 스크림
[Stream Discovery] ...

[Stream Discovery] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Stream Discovery] Cleaning up offline streams...
[Stream Discovery] Marked 5 streams as offline

[Stream Discovery] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Stream Discovery] Job completed in 45230ms
[Stream Discovery] Games processed: 10
[Stream Discovery] Games with streams: 8
[Stream Discovery] Total streams found: 45
[Stream Discovery] Streams created: 12
[Stream Discovery] Streams updated: 33
[Stream Discovery] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 방송이 없는 게임
```
[Stream Discovery] Processing game 99: Celeste
[Stream Discovery] Search keyword: "셀레스테"

[Chzzk Search] ========================================
[Chzzk Search] Searching for: "셀레스테"
[Chzzk Search] ⚠ No results found for "셀레스테"
[Chzzk Search] ========================================

[Stream Discovery] No streams found for "셀레스테"
```

## 데이터베이스 스키마

### streams 테이블 구조

```sql
CREATE TABLE streams (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  streamer_name TEXT,
  chzzk_channel_id TEXT UNIQUE,          -- 치지직 채널 ID (unique key)
  thumbnail_url TEXT,
  is_live BOOLEAN DEFAULT false,
  viewer_count INTEGER DEFAULT 0,
  stream_category TEXT,                   -- 방송 카테고리 (원본)
  game_id INTEGER REFERENCES games(id),   -- 매핑된 게임 ID
  last_chzzk_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 중요한 제약조건
- `chzzk_channel_id`: UNIQUE 제약으로 중복 방지
- `game_id`: Foreign Key로 games 테이블 참조

## 성능 및 최적화

### Rate Limiting
- **게임 간 딜레이**: 1.5초 (1500ms)
- **이유**: 치지직 API 봇 차단 방지

```typescript
await delay(1500) // Between games
```

### 배치 처리
- 한 번에 **최대 20개** 스트림 검색
- `limit` 파라미터로 처리할 게임 수 제한 가능

### 권장 Cron 설정

```javascript
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/update-streams",
      "schedule": "*/5 * * * *"  // 5분마다 실행
    }
  ]
}
```

## 운영 가이드

### 1. 초기 설정

```bash
# 1. DB에 게임 등록 (Steam 데이터 활용)
curl http://localhost:3000/api/cron/update-steam

# 2. 한글 제목 추가 (sql/06_add_korean_title.sql 실행)

# 3. 스트림 탐색 실행
curl http://localhost:3000/api/cron/update-streams
```

### 2. 모니터링 쿼리

```sql
-- 실시간 라이브 스트림 수
SELECT COUNT(*) FROM streams WHERE is_live = true;

-- 게임별 라이브 방송 수
SELECT 
  g.title,
  g.korean_title,
  COUNT(s.id) as live_streams,
  SUM(s.viewer_count) as total_viewers
FROM games g
LEFT JOIN streams s ON g.id = s.game_id AND s.is_live = true
GROUP BY g.id, g.title, g.korean_title
ORDER BY total_viewers DESC;

-- 최근 업데이트 시간 확인
SELECT 
  MAX(last_chzzk_update) as last_update,
  NOW() - MAX(last_chzzk_update) as time_since_update
FROM streams;
```

### 3. 문제 해결

#### 방송이 검색되지 않는 경우

1. **한글 제목 확인**
   ```sql
   SELECT id, title, korean_title 
   FROM games 
   WHERE korean_title IS NULL;
   ```

2. **수동으로 한글 제목 추가**
   ```sql
   UPDATE games 
   SET korean_title = '정확한 치지직 검색어'
   WHERE id = 게임ID;
   ```

3. **직접 검색 테스트**
   - 치지직 웹사이트에서 해당 게임 검색
   - 실제 사용되는 한글 이름 확인

#### API 에러 발생 시

1. **봇 차단 (Error 9004)**
   - 딜레이 시간 증가: `1500ms` → `2000ms`
   - User-Agent 헤더 확인
   - 검색 빈도 줄이기

2. **Rate Limit 초과**
   - `limit` 파라미터로 게임 수 제한
   - Cron 실행 주기 늘리기 (5분 → 10분)

## 향후 개선 사항

### 1. 검색어 최적화
```sql
-- 대체 검색어 테이블 추가
CREATE TABLE game_search_keywords (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES games(id),
  keyword TEXT NOT NULL,
  priority INTEGER DEFAULT 0
);
```

### 2. 스트리머 관리
```sql
-- 스트리머 테이블 분리
CREATE TABLE streamers (
  id SERIAL PRIMARY KEY,
  chzzk_channel_id TEXT UNIQUE,
  name TEXT NOT NULL,
  follower_count INTEGER
);
```

### 3. 통계 및 분석
- 게임별 평균 시청자 수
- 시간대별 방송 트렌드
- 인기 상승 게임 감지

### 4. 알림 시스템
- 새로운 인기 방송 알림
- 특정 게임 라이브 알림
- 시청자 수 급증 감지

## 관련 파일

### 코드
- `lib/chzzk.ts` - 치지직 API 및 검색 로직
- `app/api/cron/update-streams/route.ts` - 스트림 탐색 Cron Job

### SQL
- `sql/06_add_korean_title.sql` - 한글 제목 컬럼 추가

### 문서
- `CHZZK_INTEGRATION.md` - 치지직 API 통합 가이드
- `CHZZK_GAME_MAPPING.md` - 게임 매핑 가이드
- `STREAM_DISCOVERY.md` (현재 문서)

## 버전 히스토리

- **v2.0** (2026-02-15): 게임 기반 자동 탐색 시스템
  - `searchChzzkLives()` 함수 추가
  - 전면적인 로직 재설계
  - Upsert 기능 구현
  - 오프라인 스트림 자동 처리

- **v1.0** (2026-02-14): 개별 채널 업데이트 시스템
  - 등록된 채널만 업데이트
  - 수동 채널 등록 필요
