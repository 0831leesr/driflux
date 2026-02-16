# 치지직 인기 카테고리 기반 스트림 수집

## 🎯 개요
치지직의 **실시간 인기 카테고리**를 자동으로 가져와서, 인기 있는 게임의 방송만 선택적으로 수집하는 기능입니다.

## 🚀 빠른 시작

### 1단계: 인기 카테고리 확인 (테스트)

```bash
# 브라우저에서:
http://localhost:3000/api/cron/test-categories

# 또는 curl:
curl http://localhost:3000/api/cron/test-categories
```

**예상 결과**:
```json
{
  "success": true,
  "message": "Found 10 popular categories",
  "categories": [
    "림월드",
    "마인크래프트",
    "리그 오브 레전드",
    "발로란트",
    "로스트아크",
    "오버워치",
    "스타크래프트",
    "메이플스토리",
    "던전 앤 파이터",
    "피파 온라인"
  ],
  "note": "Use these categories as game titles in your database"
}
```

### 2단계: 인기 카테고리 모드로 스트림 수집

```bash
# 기본 (상위 10개 카테고리)
http://localhost:3000/api/cron/update-streams?popular=true

# 상위 5개만
http://localhost:3000/api/cron/update-streams?popular=true&popularSize=5

# 상위 20개
http://localhost:3000/api/cron/update-streams?popular=true&popularSize=20
```

## 📊 동작 방식

### 기존 모드 vs 인기 카테고리 모드

#### 기존 모드 (default)
```
DB의 모든 게임 → 각 게임 검색 → 방송 수집
```
- **장점**: DB에 있는 모든 게임의 방송 수집
- **단점**: 방송이 없는 게임도 검색 (시간 낭비)

#### 인기 카테고리 모드 (popular=true)
```
치지직 인기 카테고리 → 인기 게임만 검색 → 방송 수집
```
- **장점**: 
  - 실시간 인기 게임만 수집 (효율적)
  - 방송이 많은 게임 우선 처리
  - 빠른 실행 시간
- **단점**: 
  - 마이너 게임은 제외될 수 있음

## 🔧 API 엔드포인트

### 1. 인기 카테고리 테스트 API

**엔드포인트**: `GET /api/cron/test-categories`

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `size` | number | 20 | 가져올 카테고리 수 |

**사용 예시**:
```bash
# 상위 10개
curl http://localhost:3000/api/cron/test-categories?size=10

# 상위 30개
curl http://localhost:3000/api/cron/test-categories?size=30
```

### 2. 스트림 수집 API (인기 모드)

**엔드포인트**: `GET /api/cron/update-streams`

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `popular` | boolean | false | 인기 카테고리 모드 활성화 |
| `popularSize` | number | 10 | 처리할 인기 카테고리 수 |
| `limit` | number | all | (기존 모드 전용) 처리할 게임 수 |
| `gameId` | number | - | (기존 모드 전용) 특정 게임만 처리 |

**모드 비교**:

```bash
# 기존 모드: DB의 모든 게임
curl http://localhost:3000/api/cron/update-streams

# 기존 모드: DB의 처음 5개 게임만
curl http://localhost:3000/api/cron/update-streams?limit=5

# 인기 모드: 상위 10개 인기 카테고리
curl http://localhost:3000/api/cron/update-streams?popular=true

# 인기 모드: 상위 3개만
curl http://localhost:3000/api/cron/update-streams?popular=true&popularSize=3
```

## 📈 예상 결과

### 인기 카테고리 테스트 API
```json
{
  "success": true,
  "message": "Found 10 popular categories",
  "categories": [
    "림월드",
    "마인크래프트",
    "리그 오브 레전드",
    "발로란트",
    "로스트아크",
    "오버워치",
    "스타크래프트",
    "메이플스토리",
    "던전 앤 파이터",
    "피파 온라인"
  ]
}
```

### 인기 모드 스트림 수집
```json
{
  "success": true,
  "message": "Processed 10 games, found 156 streams (45 new, 111 updated)",
  "stats": {
    "gamesProcessed": 10,
    "gamesWithStreams": 10,
    "streamsFound": 156,
    "streamsCreated": 45,
    "streamsUpdated": 111,
    "streamsFailed": 0,
    "gameDetails": [
      {
        "gameId": 42,
        "gameTitle": "림월드",
        "searchKeyword": "림월드",
        "streamsFound": 35,
        "status": "success"
      },
      {
        "gameId": 15,
        "gameTitle": "마인크래프트",
        "searchKeyword": "마인크래프트",
        "streamsFound": 28,
        "status": "success"
      }
    ]
  }
}
```

## 🎮 카테고리 매칭 로직

### 자동 게임 매칭
인기 카테고리를 가져온 후, DB의 게임과 자동 매칭합니다:

```
1. 치지직 카테고리: "리그 오브 레전드"
   ↓
2. DB에서 게임 검색:
   - korean_title ILIKE '%리그 오브 레전드%' OR
   - title ILIKE '%리그 오브 레전드%'
   ↓
3. 매칭 성공 → 해당 게임 ID 사용
   매칭 실패 → 카테고리 이름으로 직접 검색
```

### 콘솔 로그 예시

**매칭 성공**:
```
[Stream Discovery] ✓ Matched category "리그 오브 레전드" to game: League of Legends (ID: 42)
```

**매칭 실패** (새 게임):
```
[Stream Discovery] ⚠ No game found for category "림월드", will search directly
[Stream Discovery] Found 35 streams for "림월드"
```

## 💡 권장 사용 시나리오

### 시나리오 1: 초기 데이터 수집
```bash
# 1. 인기 카테고리 확인
curl http://localhost:3000/api/cron/test-categories

# 2. 상위 20개 카테고리로 방송 수집
curl http://localhost:3000/api/cron/update-streams?popular=true&popularSize=20
```

### 시나리오 2: 일일 자동 업데이트
```javascript
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/update-streams?popular=true&popularSize=15",
      "schedule": "*/10 * * * *"  // 10분마다 상위 15개 카테고리
    }
  ]
}
```

### 시나리오 3: 혼합 전략
```bash
# 오전: 인기 카테고리 (빠르게)
curl http://localhost:3000/api/cron/update-streams?popular=true&popularSize=10

# 오후: 전체 게임 (느리지만 완전)
curl http://localhost:3000/api/cron/update-streams?limit=30
```

## 🔍 API 엔드포인트 탐색

치지직 API는 여러 엔드포인트를 시도합니다:

```typescript
const possibleEndpoints = [
  `${CHZZK_API_BASE}/service/v1/lives/categories/popular`,
  `${CHZZK_API_BASE}/service/v1/categories/live`,
  `${CHZZK_API_BASE}/service/v1/categories`,
  `${CHZZK_API_BASE}/service/v2/categories/live`,
]
```

첫 번째 성공한 엔드포인트를 사용하며, 모두 실패하면 빈 배열을 반환합니다.

## 📊 모니터링 쿼리

### 인기 카테고리별 방송 수
```sql
SELECT 
  stream_category,
  COUNT(*) as stream_count,
  SUM(viewer_count) as total_viewers,
  AVG(viewer_count) as avg_viewers
FROM streams
WHERE is_live = true 
  AND stream_category IS NOT NULL
GROUP BY stream_category
ORDER BY total_viewers DESC
LIMIT 20;
```

### 매칭되지 않은 카테고리
```sql
-- DB에는 없지만 인기 있는 카테고리
SELECT DISTINCT stream_category
FROM streams
WHERE game_id IS NULL 
  AND stream_category IS NOT NULL
  AND is_live = true
ORDER BY stream_category;
```

### 게임 추가 필요 목록
```sql
-- 방송은 많은데 게임이 없는 카테고리
SELECT 
  stream_category,
  COUNT(*) as stream_count,
  SUM(viewer_count) as total_viewers
FROM streams
WHERE game_id IS NULL 
  AND stream_category IS NOT NULL
  AND is_live = true
GROUP BY stream_category
HAVING COUNT(*) > 5
ORDER BY total_viewers DESC;
```

## 🛠️ 게임 추가 방법

인기 카테고리에 대응하는 게임이 DB에 없으면 추가하세요:

```sql
-- 림월드 추가
INSERT INTO games (title, korean_title)
VALUES ('RimWorld', '림월드')
ON CONFLICT DO NOTHING;

-- 메이플스토리 추가
INSERT INTO games (title, korean_title)
VALUES ('MapleStory', '메이플스토리')
ON CONFLICT DO NOTHING;

-- 던전 앤 파이터 추가
INSERT INTO games (title, korean_title)
VALUES ('Dungeon & Fighter', '던전 앤 파이터')
ON CONFLICT DO NOTHING;

-- 확인
SELECT id, title, korean_title 
FROM games 
WHERE korean_title IN ('림월드', '메이플스토리', '던전 앤 파이터');
```

## 🎯 성능 비교

### 기존 모드 (전체 게임)
- **게임 수**: DB의 모든 게임 (예: 100개)
- **실행 시간**: ~150초 (100개 × 1.5초)
- **방송 발견**: 30개
- **효율**: 낮음 (많은 게임이 방송 없음)

### 인기 모드 (상위 10개)
- **게임 수**: 인기 카테고리 10개
- **실행 시간**: ~15초 (10개 × 1.5초)
- **방송 발견**: 150개
- **효율**: 높음 (모든 카테고리가 방송 많음)

## 🚨 주의사항

### 1. API 응답 변화
치지직 API 구조가 변경될 수 있습니다. 로그를 모니터링하세요:

```
[Chzzk Categories] Raw Response: {...}
```

### 2. Rate Limiting
너무 많은 카테고리를 요청하지 마세요:
- **권장**: 10-20개
- **최대**: 50개

### 3. 자동 매칭 한계
일부 카테고리는 자동 매칭이 안 될 수 있습니다:
- "카트라이더 드리프트" → "KartRider" (매칭 실패)
- "피파 온라인 4" → "FIFA" (부분 매칭)

**해결**: 수동으로 게임 추가

## 📝 체크리스트

인기 카테고리 모드 사용 전:

- [ ] 테스트 API로 카테고리 확인
- [ ] 주요 인기 게임이 DB에 있는지 확인
- [ ] 없는 게임은 수동으로 추가
- [ ] 인기 모드로 스트림 수집 실행
- [ ] 결과 확인 (streams 테이블)

## 🔗 관련 파일

### 코드
- `lib/chzzk.ts` - `getPopularCategories()` 함수
- `app/api/cron/update-streams/route.ts` - 인기 모드 로직
- `app/api/cron/test-categories/route.ts` - 테스트 API

### 문서
- `STREAM_DISCOVERY.md` - 스트림 탐색 상세 가이드
- `POPULAR_CATEGORIES_GUIDE.md` (현재 문서)
- `QUICK_START_STREAM_DISCOVERY.md` - 빠른 시작 가이드

## 💡 FAQ

### Q: 인기 카테고리가 없다고 나옵니다
**A**: 치지직 API 엔드포인트가 변경되었을 수 있습니다. 콘솔 로그를 확인하세요.

### Q: 일부 카테고리만 방송이 수집됩니다
**A**: DB에 해당 게임이 없거나 한글 제목이 다를 수 있습니다. `korean_title`을 확인하세요.

### Q: 기존 모드와 인기 모드 중 뭘 써야 하나요?
**A**: 
- **빠른 업데이트 필요**: 인기 모드 (10분마다)
- **모든 게임 커버**: 기존 모드 (1시간마다)
- **추천**: 두 가지 혼용

### Q: 카테고리 수는 몇 개가 적당한가요?
**A**: 
- **일반적**: 10-15개 (충분한 커버리지)
- **빠른 실행**: 5개
- **완전한 커버**: 20-30개

## 🎉 완료!

이제 치지직의 실시간 인기 게임 방송을 자동으로 수집할 수 있습니다!

```bash
# 지금 바로 시도해보세요
curl http://localhost:3000/api/cron/test-categories
curl "http://localhost:3000/api/cron/update-streams?popular=true&popularSize=5"
```
