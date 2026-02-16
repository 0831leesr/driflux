# 🎮 스팀 게임 매칭 시스템 v2.0 - 신뢰도 기반 자동 매칭

## 개요

치지직의 게임 이름을 스팀에서 자동으로 검색하고, **정확한 매칭만 허용**하는 시스템입니다.

### 핵심 개선사항

**기존 v1.0 (하드코딩 매핑 테이블)**
- ❌ 신작 게임 대응 어려움
- ❌ 갑자기 인기 급상승한 게임 누락
- ❌ 수동으로 매핑 추가해야 함

**개선 v2.0 (신뢰도 기반 자동 매칭)**
- ✅ 신작 게임 자동 발견
- ✅ 인기 급상승 게임 즉시 대응
- ✅ 정확한 매칭만 허용 (80% 이상)
- ✅ 잘못된 매칭 방지
- ✅ 스팀 미서비스 게임 명시적 처리

## 동작 원리

### 1단계: 스팀 검색

```
치지직 게임 이름: "엘든 링"
  ↓
스팀 API 검색 (한글 지원)
  ↓
검색 결과 (상위 10개):
  1. ELDEN RING (appid: 1245620)
  2. Elden Path (appid: 999999)
  3. Ring of Elden (appid: 888888)
```

### 2단계: 정확도 분석

```typescript
각 결과에 대해 유사도 계산:
  - "엘든 링" vs "ELDEN RING" → 90% 유사
  - "엘든 링" vs "Elden Path" → 45% 유사
  - "엘든 링" vs "Ring of Elden" → 40% 유사

최고 점수: 90% (임계값 80% 이상) → ✓ 매칭 성공
```

### 3단계: 결과 처리

```typescript
if (유사도 >= 80%) {
  // 스팀 게임으로 저장
  platform = 'steam'
  steam_appid = 1245620
} else {
  // 스팀 미서비스 게임
  platform = 'non-steam'
  steam_appid = null
}
```

## 유사도 계산 알고리즘

### 1. 문자열 정규화

```typescript
normalizeString("ELDEN RING") 
  → "eldenring" (소문자 + 공백/특수문자 제거)

normalizeString("엘든 링")
  → "엘든링" (한글 유지, 공백 제거)
```

### 2. 유사도 점수 계산

```typescript
100% - 정확히 동일
 80% - 한쪽이 다른 쪽을 포함 (부분 일치)
0-80% - Levenshtein 거리 기반 계산
```

### 예시

| 치지직 이름 | 스팀 검색 결과 | 유사도 | 결과 |
|------------|---------------|--------|------|
| 배틀그라운드 | PUBG: BATTLEGROUNDS | 85% | ✓ 매칭 |
| 엘든 링 | ELDEN RING | 90% | ✓ 매칭 |
| 리그 오브 레전드 | (검색 결과 없음) | 0% | ⊗ 비스팀 |
| 로스트아크 | Lost Ark | 95% | ✓ 매칭 |
| 원신 | Genshin Impact (유사도 낮음) | 20% | ⊗ 비스팀 |

## 데이터베이스 스키마

### games 테이블 - 새 컬럼

```sql
ALTER TABLE games 
ADD COLUMN platform TEXT DEFAULT 'unknown';

-- 가능한 값:
-- 'steam'     : 스팀에서 서비스
-- 'non-steam' : 스팀 미서비스 (모바일, 라이엇 등)
-- 'unknown'   : 아직 확인 안됨
```

## 사용 방법

### Step 1: SQL 실행

```bash
# Supabase SQL Editor에서 실행
sql/10_add_platform_field.sql
```

### Step 2: API 실행

```bash
# 기존과 동일
http://localhost:3000/api/cron/discover-top-games?size=20
```

**개선된 로그:**
```
[Top Games Discovery] Processing: "엘든 링"
[Steam Match] Analyzing 10 results for "엘든 링"
[Steam Match]   - "ELDEN RING" (appid: 1245620): 90% similar
[Steam Match]   - "Elden Path" (appid: 999999): 45% similar
[Steam Match] ✓ Best match: "ELDEN RING" (90% confidence)
[Top Games Discovery] ✓ Found Steam match: "ELDEN RING" (90% confidence)
[Top Games Discovery] ✓ Updated game "엘든 링" with Steam info

[Top Games Discovery] Processing: "리그 오브 레전드"
[Steam Match] No results found for "리그 오브 레전드"
[Top Games Discovery] ⊗ "리그 오브 레전드" not found on Steam (or low confidence match)
[Top Games Discovery] ✓ Marked "리그 오브 레전드" as non-Steam game
```

### Step 3: 결과 확인

```sql
-- 스팀 게임만 보기
SELECT 
  id,
  title,
  korean_title,
  platform,
  steam_appid,
  price_krw
FROM games
WHERE platform = 'steam'
ORDER BY popularity_rank;

-- 비스팀 게임 보기
SELECT 
  id,
  title,
  platform,
  total_viewers
FROM games
WHERE platform = 'non-steam'
ORDER BY total_viewers DESC;

-- 플랫폼별 통계
SELECT 
  platform,
  COUNT(*) as game_count,
  SUM(total_viewers) as total_viewers
FROM games
GROUP BY platform
ORDER BY total_viewers DESC;
```

## 임계값 조정

### 유사도 임계값 변경

`app/api/cron/discover-top-games/route.ts`:

```typescript
// 현재: 80% 이상만 매칭
const matchResult = await findSteamAppIdWithConfidence(category, 80)

// 더 엄격하게 (90% 이상)
const matchResult = await findSteamAppIdWithConfidence(category, 90)

// 더 관대하게 (70% 이상) - 권장하지 않음
const matchResult = await findSteamAppIdWithConfidence(category, 70)
```

### 권장 임계값

- **80%**: 균형 잡힌 설정 (권장) ✓
- **90%**: 매우 엄격 (정확도 최우선)
- **70%**: 관대함 (잘못된 매칭 위험)

## 장점

### 1. 자동화

- ✅ 신작 게임 자동 발견
- ✅ 실시간 인기 게임 추적
- ✅ 수동 작업 불필요

### 2. 정확도

- ✅ 정확한 매칭만 허용
- ✅ 잘못된 매칭 방지
- ✅ 신뢰도 점수 제공

### 3. 확장성

- ✅ 다른 플랫폼 추가 가능
- ✅ platform 필드로 분류
- ✅ 향후 Epic, Origin 등 지원 가능

## 비스팀 게임 처리

### 자동으로 비스팀으로 분류되는 경우

1. **스팀 검색 결과 없음**
   - 예: 리그 오브 레전드, 원신

2. **유사도가 임계값 이하**
   - 예: 이름이 전혀 다른 경우

3. **스팀 API 에러**
   - 예: 지역 제한, 삭제된 게임

### 비스팀 게임 활용

```sql
-- 향후 다른 플랫폼 연동
UPDATE games
SET 
  platform = 'riot',
  riot_game_id = 'lol',
  cover_image_url = 'https://...'
WHERE title = '리그 오브 레전드';
```

## 예상 결과

### Before (v1.0 - 매핑 테이블)

```
✓ 20개 게임 발견
✓ 5개 스팀 게임 (매핑 있음)
? 15개 매핑 없음 → 누락
```

### After (v2.0 - 자동 매칭)

```
✓ 20개 게임 발견
✓ 12개 스팀 게임 (자동 매칭, 80%+)
⊗ 8개 비스팀 게임 (명시적 분류)
```

## 모니터링

### 매칭 품질 확인

```sql
-- 최근 추가된 게임들 확인
SELECT 
  title,
  platform,
  steam_appid,
  total_viewers,
  created_at
FROM games
ORDER BY created_at DESC
LIMIT 20;

-- 플랫폼별 분포
SELECT 
  platform,
  COUNT(*) as count
FROM games
GROUP BY platform;
```

### 잘못 매칭된 게임 수정

```sql
-- 스팀 게임이지만 누락된 경우
UPDATE games
SET 
  platform = 'steam',
  steam_appid = 1234567
WHERE title = '게임 이름';

-- 스팀 게임으로 잘못 분류된 경우
UPDATE games
SET 
  platform = 'non-steam',
  steam_appid = NULL
WHERE title = '게임 이름';
```

## 문제 해결

### Q: 스팀 게임인데 매칭이 안돼요

**A: 유사도가 낮을 가능성**

1. 로그에서 유사도 점수 확인:
   ```
   [Steam Match]   - "Game Name" (appid: 123): 65% similar
   ```

2. 임계값 일시적으로 낮추기:
   ```typescript
   const matchResult = await findSteamAppIdWithConfidence(category, 60)
   ```

3. 수동으로 업데이트:
   ```sql
   UPDATE games SET platform = 'steam', steam_appid = 123 WHERE title = '게임명';
   ```

### Q: 비스팀 게임이 스팀으로 분류됐어요

**A: 이름이 유사한 다른 게임**

수동 수정:
```sql
UPDATE games 
SET 
  platform = 'non-steam',
  steam_appid = NULL
WHERE title = '게임명';
```

### Q: 검색 결과가 너무 많아요

**A: 상위 10개만 분석**

더 많이 분석하려면 `lib/steam.ts` 수정:
```typescript
const results = await searchSteamGame(gameName, 20) // 10 → 20
```

## 향후 계획

### Phase 1 (현재) ✓
- 스팀 자동 매칭
- 비스팀 게임 분류

### Phase 2 (예정)
- 라이엇 게임즈 API 연동
- Epic Games Store 연동
- 넥슨 게임 분류

### Phase 3 (예정)
- 모바일 게임 (Google Play, App Store)
- 콘솔 게임 (PlayStation, Xbox)

## 관련 파일

- `lib/steam.ts` - 스팀 API + 매칭 알고리즘
- `app/api/cron/discover-top-games/route.ts` - 게임 발견 API
- `sql/10_add_platform_field.sql` - platform 컬럼 추가

## 버전 히스토리

- **v2.0** (2026-02-15): 신뢰도 기반 자동 매칭
  - Levenshtein 거리 알고리즘
  - 80% 임계값 적용
  - platform 필드 추가
  - 비스팀 게임 자동 분류

- **v1.0** (2026-02-15): 하드코딩 매핑 테이블
  - 85개 게임 사전 매핑
  - 신작 대응 어려움
  - ~~폐기됨~~ (참고용 보존)
