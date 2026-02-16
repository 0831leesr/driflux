# 🚀 스팀 매칭 v2.0 - 빠른 시작 가이드

## 5분 안에 시작하기

### Step 1: SQL 실행 (1분)

Supabase SQL Editor에서 실행:

```sql
-- platform 컬럼 추가
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'unknown';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_games_platform ON games(platform);
```

또는 파일 전체 실행:
```bash
sql/10_add_platform_field.sql
```

### Step 2: 개발 서버 시작 (30초)

```powershell
npm run dev
```

### Step 3: API 실행 (3분)

```bash
# 테스트 (10개 스트림)
http://localhost:3000/api/cron/discover-top-games?size=10
```

### Step 4: 결과 확인 (30초)

```sql
-- 스팀 게임
SELECT title, platform, steam_appid, price_krw
FROM games
WHERE platform = 'steam'
ORDER BY popularity_rank
LIMIT 10;

-- 비스팀 게임
SELECT title, platform, total_viewers
FROM games
WHERE platform = 'non-steam'
ORDER BY total_viewers DESC
LIMIT 10;
```

## 로그 예시

### 스팀 게임 매칭 성공

```
[Top Games Discovery] Processing: "엘든 링"
[Steam Search] Searching for: "엘든 링"
[Steam Search] ✓ Found 5 results for "엘든 링"
[Steam Match] Analyzing 5 results for "엘든 링"
[Steam Match]   - "ELDEN RING" (appid: 1245620): 90% similar
[Steam Match]   - "Elden Path" (appid: 999999): 45% similar
[Steam Match] ✓ Best match: "ELDEN RING" (90% confidence)
[Top Games Discovery] ✓ Found Steam match: "ELDEN RING" (90% confidence)
[Top Games Discovery] Using Steam AppID: 1245620
[Steam API] Fetching app 1245620...
[Steam API] ✓ Successfully fetched app 1245620: ELDEN RING
[Top Games Discovery] Processing Steam data for "엘든 링":
[Top Games Discovery]   - AppID: 1245620
[Top Games Discovery]   - Title: ELDEN RING
[Top Games Discovery]   - Price: ₩64800
[Top Games Discovery]   - Tags: RPG, Action, Open World, Dark Fantasy, Souls-like
[Top Games Discovery] ✓ Updated game "엘든 링" with Steam info
```

### 비스팀 게임 처리

```
[Top Games Discovery] Processing: "리그 오브 레전드"
[Steam Search] Searching for: "리그 오브 레전드"
[Steam Search] No results found for "리그 오브 레전드"
[Steam Match] No results found for "리그 오브 레전드"
[Top Games Discovery] ⊗ "리그 오브 레전드" not found on Steam (or low confidence match)
[Top Games Discovery] Marking as non-Steam game...
[Top Games Discovery] ✓ Marked "리그 오브 레전드" as non-Steam game
```

## 예상 결과

### 스팀 게임 (예시)

| title | platform | steam_appid | price_krw |
|-------|----------|-------------|-----------|
| ELDEN RING | steam | 1245620 | 64800 |
| Lost Ark | steam | 1599340 | 0 |
| PUBG: BATTLEGROUNDS | steam | 578080 | 0 |
| Cyberpunk 2077 | steam | 1091500 | 64800 |

### 비스팀 게임 (예시)

| title | platform | total_viewers |
|-------|----------|---------------|
| 리그 오브 레전드 | non-steam | 45000 |
| 원신 | non-steam | 12000 |
| 던전앤파이터 | non-steam | 8500 |
| 오버워치 2 | non-steam | 7200 |

## 다음 단계

### 프론트엔드에서 사용

```typescript
// 스팀 게임만 가져오기
const { data: steamGames } = await supabase
  .from('games')
  .select('*')
  .eq('platform', 'steam')
  .order('popularity_rank')

// 비스팀 게임 필터
const { data: nonSteamGames } = await supabase
  .from('games')
  .select('*')
  .eq('platform', 'non-steam')
  .order('total_viewers', { ascending: false })

// 모든 게임 (플랫폼 표시)
const { data: allGames } = await supabase
  .from('games')
  .select('*')
  .order('popularity_rank')

allGames?.map(game => ({
  ...game,
  platformLabel: game.platform === 'steam' ? '스팀' : 
                 game.platform === 'non-steam' ? '기타' : '확인중'
}))
```

### Cron 자동화

`vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/discover-top-games?size=50",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

6시간마다 자동으로 실행됩니다.

## 문제 해결

### "platform 컬럼이 없다"는 에러

```sql
ALTER TABLE games ADD COLUMN platform TEXT DEFAULT 'unknown';
```

### 매칭이 너무 적어요

임계값을 낮춰보세요 (권장: 70-80):

`app/api/cron/discover-top-games/route.ts`:
```typescript
const matchResult = await findSteamAppIdWithConfidence(category, 70) // 80 → 70
```

### 로그를 더 자세히 보고 싶어요

콘솔 로그는 자동으로 출력됩니다:
- `[Steam Match]`: 매칭 과정
- `[Steam Search]`: 검색 결과
- `[Top Games Discovery]`: 전체 프로세스

## 전체 문서

자세한 내용은 `STEAM_MATCHING_V2.md`를 참조하세요.

---

**시작하셨나요?** 🎉

문제가 있으면 로그를 확인하고, 필요하면 수동으로 게임을 분류할 수 있습니다!
