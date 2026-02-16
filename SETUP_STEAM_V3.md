# 🛠️ 스팀 매칭 v3.0 - 완전 설치 가이드

## 필수 요구사항

v3.0은 v2.0과 v1.0의 모든 기능을 포함합니다.
이 가이드를 따라하면 한 번에 모든 설정이 완료됩니다.

## 1단계: SQL 실행 (필수)

### Supabase SQL Editor에서 실행

**파일 전체 실행:**
```bash
sql/11_add_english_title.sql
```

**또는 직접 실행:**

```sql
-- platform 컬럼 추가 (v2.0)
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'unknown';

-- english_title 컬럼 추가 (v3.0)
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS english_title TEXT;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_games_platform ON games(platform);
CREATE INDEX IF NOT EXISTS idx_games_english_title ON games(english_title);

-- 기존 스팀 게임 업데이트
UPDATE games 
SET platform = 'steam' 
WHERE steam_appid IS NOT NULL 
  AND (platform IS NULL OR platform = 'unknown');
```

### 실행 후 확인

```sql
-- 컬럼 확인
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'games'
  AND column_name IN ('platform', 'english_title')
ORDER BY column_name;
```

**예상 결과:**
```
column_name     | data_type | column_default
----------------+-----------+----------------
english_title   | text      | NULL
platform        | text      | 'unknown'::text
```

## 2단계: 개발 서버 시작

```powershell
npm run dev
```

서버가 정상 실행되는지 확인하세요.

## 3단계: API 테스트

```bash
# 브라우저에서 실행 (10개 스트림으로 빠른 테스트)
http://localhost:3000/api/cron/discover-top-games?size=10
```

**소요 시간:** 약 2-3분

## 4단계: 결과 확인

### 4-1. 영어 이름이 추출되었는지 확인

```sql
-- 영어 이름과 함께 게임 목록 확인
SELECT 
  title,
  english_title,
  korean_title,
  platform,
  steam_appid,
  popularity_rank
FROM games
ORDER BY popularity_rank
LIMIT 10;
```

**예상 결과:**

| title | english_title | korean_title | platform | steam_appid |
|-------|---------------|--------------|----------|-------------|
| 림월드 | Rimworld | 림월드 | steam | 294100 |
| 리그 오브 레전드 | League_of_Legends | 리그 오브 레전드 | non-steam | null |
| 엘든 링 | ELDEN_RING | 엘든 링 | steam | 1245620 |

### 4-2. 플랫폼별 통계

```sql
-- 플랫폼별 게임 수
SELECT 
  platform,
  COUNT(*) as game_count,
  COUNT(english_title) as with_english_name
FROM games
GROUP BY platform
ORDER BY game_count DESC;
```

**예상 결과:**

| platform | game_count | with_english_name |
|----------|------------|-------------------|
| steam | 8 | 8 |
| non-steam | 2 | 2 |

### 4-3. 매칭 성공률 확인

```sql
-- 전체 매칭 통계
SELECT 
  COUNT(*) as total_games,
  COUNT(CASE WHEN platform = 'steam' THEN 1 END) as steam_games,
  COUNT(CASE WHEN platform = 'non-steam' THEN 1 END) as non_steam_games,
  ROUND(COUNT(CASE WHEN platform = 'steam' THEN 1 END) * 100.0 / COUNT(*), 2) as steam_percentage
FROM games
WHERE popularity_rank IS NOT NULL;
```

**예상 결과:**

| total_games | steam_games | non_steam_games | steam_percentage |
|-------------|-------------|-----------------|------------------|
| 10 | 9 | 1 | 90.00 |

## 5단계: 로그 확인 (선택)

터미널에서 다음 로그가 보여야 합니다:

### ✓ 영어 이름 추출 성공

```
[Top Games Discovery] Saving game #1: "림월드"
[Top Games Discovery]   English name: "Rimworld"
```

### ✓ 영어로 스팀 검색

```
[Top Games Discovery] 🔍 Searching Steam with ENGLISH name: "Rimworld"
[Steam Match] Analyzing 5 results for "Rimworld"
[Steam Match]   - "RimWorld" (appid: 294100): 95% similar
[Steam Match] ✓ Best match: "RimWorld" (95% confidence)
[Top Games Discovery] ✓ Found match using English name!
```

### ⚠ 영어 실패 → 한글 폴백

```
[Top Games Discovery] 🔍 Searching Steam with ENGLISH name: "PUBG"
[Steam Match] ✗ No match above 80% threshold
[Top Games Discovery] ⚠ English search failed, trying Korean name...
[Top Games Discovery] 🔍 Searching Steam with KOREAN name: "배틀그라운드"
[Steam Match] ✓ Best match: "PUBG: BATTLEGROUNDS" (85% confidence)
```

## 문제 해결

### 오류: "column platform does not exist"

**원인:** SQL을 실행하지 않았습니다.

**해결:**
```sql
ALTER TABLE games ADD COLUMN platform TEXT DEFAULT 'unknown';
```

### 오류: "column english_title does not exist"

**원인:** SQL을 실행하지 않았습니다.

**해결:**
```sql
ALTER TABLE games ADD COLUMN english_title TEXT;
```

### 영어 이름이 모두 NULL입니다

**원인:** 치지직 API에서 `liveCategory` 필드를 제공하지 않는 게임입니다.

**확인:**
```
[Top Games Discovery]   English name: null  ← 영어 이름 없음
```

**해결:** 정상입니다. 한글로만 검색됩니다.

### 매칭률이 낮습니다 (50% 이하)

**원인:** 임계값이 너무 높을 수 있습니다.

**해결:** 임계값을 낮춰보세요 (80 → 70):

`app/api/cron/discover-top-games/route.ts`:
```typescript
// 영어 검색
matchResult = await findSteamAppIdWithConfidence(englishName, 70) // 80 → 70

// 한글 검색
matchResult = await findSteamAppIdWithConfidence(category, 70) // 80 → 70
```

## 완료 확인 체크리스트

- [ ] SQL 실행 완료
- [ ] `platform` 컬럼 존재 확인
- [ ] `english_title` 컬럼 존재 확인
- [ ] 개발 서버 실행
- [ ] API 실행 완료 (200 OK)
- [ ] 로그에서 "English name:" 확인
- [ ] 로그에서 "🔍 Searching Steam with ENGLISH name" 확인
- [ ] DB에서 게임 데이터 확인
- [ ] 영어 이름이 추출된 게임 확인
- [ ] 플랫폼이 `steam` 또는 `non-steam`으로 설정됨

## 다음 단계

설치가 완료되었습니다! 이제:

1. **프론트엔드 연동**
   - 게임 목록 가져오기
   - 플랫폼별 필터링
   - 치지직 카테고리 링크 생성

2. **Cron 자동화**
   - `vercel.json` 설정
   - 6시간마다 자동 업데이트

3. **모니터링**
   - 매칭률 추적
   - 플랫폼별 통계
   - 영어 이름 추출률

## 참고 문서

- `STEAM_MATCHING_V3.md` - 전체 가이드
- `QUICK_START_STEAM_V3.md` - 빠른 시작
- `CHANGELOG_STEAM_V3.md` - 변경사항

---

**설치 완료!** 🎉

질문이 있으면 로그를 확인하거나 문의하세요!
