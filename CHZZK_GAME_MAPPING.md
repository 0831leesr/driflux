# Chzzk Stream-Game Mapping Implementation

## 개요
치지직(Chzzk) 스트림과 게임 DB를 자동으로 매핑하는 기능을 구현했습니다. 스트림 업데이트 시 `stream_category`를 기반으로 `games` 테이블과 연결하여 `game_id`를 자동으로 채웁니다.

## 주요 변경사항

### 1. DB 스키마 확장 (`sql/06_add_korean_title.sql`)

#### 추가된 컬럼
- `games.korean_title` (TEXT): 한글 게임 제목 저장

#### 인덱스
- `idx_games_korean_title`: 빠른 검색을 위한 인덱스

#### 예시 데이터
다음 인기 게임의 한글 제목이 자동으로 설정됩니다:
- 리그 오브 레전드 (League of Legends)
- 발로란트 (Valorant)
- 마인크래프트 (Minecraft)
- 로스트아크 (Lost Ark)
- 오버워치 (Overwatch)
- 등...

### 2. 게임 매핑 로직 (`lib/chzzk.ts`)

#### 새로운 함수: `findGameByCategory()`

**매칭 전략 (3단계)**:

1. **정확 매칭** (Exact Match)
   - `korean_title`과 정확히 일치하는 게임 검색
   - 예: "리그 오브 레전드" → League of Legends

2. **한글 부분 매칭** (Korean Partial Match)
   - `korean_title`에 검색어가 포함된 게임 검색
   - 예: "리그" → "리그 오브 레전드"

3. **영어 부분 매칭** (English Partial Match)
   - `title`에 검색어가 포함된 게임 검색
   - 예: "League" → "League of Legends"

**사용 예시**:
```typescript
const gameId = await findGameByCategory("리그 오브 레전드", supabaseClient)
// Returns: 게임 ID (예: 42) 또는 null
```

### 3. 스트림 업데이트 API 수정 (`app/api/cron/update-streams/route.ts`)

#### 변경사항
- `findGameByCategory()` 함수 import
- 스트림 업데이트 시 `game_id` 자동 매핑 및 저장

#### 로직 흐름
```
1. 치지적 API에서 스트림 정보 가져오기
   ↓
2. stream_category 추출 (예: "리그 오브 레전드")
   ↓
3. findGameByCategory() 호출
   ↓
4. 매칭된 game_id와 함께 streams 테이블 업데이트
```

## 설치 및 사용

### 1. DB 마이그레이션 실행

Supabase SQL Editor에서 다음 파일을 실행하세요:

```sql
-- sql/06_add_korean_title.sql 실행
```

### 2. 스트림 업데이트 API 실행

```bash
# 모든 스트림 업데이트
curl http://localhost:3000/api/cron/update-streams

# 특정 채널만 업데이트
curl http://localhost:3000/api/cron/update-streams?channelId=c1f0a24755fb3e583fb0a588f921c84b
```

### 3. 결과 확인

```sql
-- 게임이 매핑된 스트림 조회
SELECT 
  s.id,
  s.title AS stream_title,
  s.stream_category,
  s.game_id,
  g.title AS game_title,
  g.korean_title,
  s.is_live,
  s.viewer_count
FROM streams s
LEFT JOIN games g ON s.game_id = g.id
WHERE s.game_id IS NOT NULL
ORDER BY s.viewer_count DESC;
```

## 콘솔 로그 예시

### 성공적인 매핑
```
[Chzzk Update] Processing: 한동숙 (Channel ID: c1f0a24755fb3e583fb0a588f921c84b)
[Game Mapping] Searching for game with category: "리그 오브 레전드"
[Game Mapping] ✓ Exact match found: League of Legends (ID: 42)
[Chzzk Update] ✓ Mapped category "리그 오브 레전드" to game_id: 42
```

### 매칭 실패 (게임 미등록)
```
[Game Mapping] Searching for game with category: "쿠키런 킹덤"
[Game Mapping] ✗ No match found for category: "쿠키런 킹덤"
[Chzzk Update] ⚠ No game found for category: "쿠키런 킹덤"
```

## 추가 게임 등록

새로운 게임의 한글 제목을 추가하려면:

```sql
-- 1. 게임이 이미 존재하는 경우
UPDATE games 
SET korean_title = '쿠키런 킹덤' 
WHERE title ILIKE '%cookie run%';

-- 2. 새 게임 추가
INSERT INTO games (title, korean_title)
VALUES ('Cookie Run: Kingdom', '쿠키런 킹덤');
```

## 성능 최적화

### 인덱스 활용
- `idx_games_korean_title`: 한글 제목 검색 최적화
- `idx_games_title`: 영어 제목 검색 (기존)

### 매칭 우선순위
1. 정확 매칭 (가장 빠름)
2. 한글 부분 매칭
3. 영어 부분 매칭 (가장 느림)

## 향후 개선 사항

### 1. 매핑 테이블 추가
복잡한 매핑을 위한 별도 테이블 고려:
```sql
CREATE TABLE game_aliases (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES games(id),
  alias TEXT NOT NULL,
  language VARCHAR(10) DEFAULT 'ko'
);
```

### 2. AI 기반 유사도 매칭
- 레벤슈타인 거리(Levenshtein Distance) 활용
- PostgreSQL `pg_trgm` 확장 사용

### 3. 수동 매핑 관리 UI
- 매핑되지 않은 카테고리 목록 표시
- 관리자 페이지에서 수동 매핑

### 4. 통계 및 모니터링
```sql
-- 매핑되지 않은 카테고리 집계
SELECT 
  stream_category,
  COUNT(*) as stream_count,
  SUM(viewer_count) as total_viewers
FROM streams
WHERE stream_category IS NOT NULL 
  AND game_id IS NULL
  AND is_live = true
GROUP BY stream_category
ORDER BY stream_count DESC;
```

## 관련 파일

### SQL
- `sql/06_add_korean_title.sql` - DB 스키마 업데이트

### 코드
- `lib/chzzk.ts` - 치지직 API 및 게임 매핑 로직
- `app/api/cron/update-streams/route.ts` - 스트림 업데이트 cron job

### 문서
- `CHZZK_INTEGRATION.md` - 치지직 API 통합 가이드
- `CHZZK_GAME_MAPPING.md` (현재 문서)

## 테스트 시나리오

### 1. 정확 매칭 테스트
```typescript
// 예상: League of Legends (ID: 42)
const result = await findGameByCategory("리그 오브 레전드", supabase)
```

### 2. 부분 매칭 테스트
```typescript
// 예상: Minecraft (ID: 15)
const result = await findGameByCategory("마크", supabase)
```

### 3. 영어 카테고리 테스트
```typescript
// 예상: Valorant (ID: 23)
const result = await findGameByCategory("Valorant", supabase)
```

### 4. 매칭 실패 테스트
```typescript
// 예상: null
const result = await findGameByCategory("존재하지 않는 게임", supabase)
```

## 문제 해결

### 매핑이 안 되는 경우

1. **한글 제목 확인**
   ```sql
   SELECT id, title, korean_title 
   FROM games 
   WHERE korean_title IS NULL;
   ```

2. **카테고리 이름 확인**
   ```sql
   SELECT DISTINCT stream_category 
   FROM streams 
   WHERE game_id IS NULL 
     AND stream_category IS NOT NULL;
   ```

3. **수동 매핑 추가**
   ```sql
   UPDATE games 
   SET korean_title = '정확한 한글 제목'
   WHERE title ILIKE '%영어제목%';
   ```

## 버전 히스토리

- **v1.0** (2026-02-15): 초기 구현
  - `korean_title` 컬럼 추가
  - 3단계 매칭 알고리즘
  - 자동 game_id 업데이트
