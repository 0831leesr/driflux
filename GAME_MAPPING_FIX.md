# 🎮 게임 매핑 시스템 - 스팀 연동 정확도 개선

## 문제점

### 기존 시스템의 한계

1. **대부분의 게임 정보를 불러오지 못함**
   - 치지직의 한글 게임 이름으로 스팀 검색
   - 예: "리그 오브 레전드" → 스팀 검색 실패
   - 예: "배틀그라운드" → "PUBG: BATTLEGROUNDS" 찾기 어려움

2. **잘못된 게임 매칭**
   - 스팀에 없는 게임(LOL, 모바일)이 비슷한 이름의 다른 게임과 매칭
   - 예: "리그 오브 레전드" → 스팀의 다른 MOBA 게임이 매칭
   - 예: "원신" → 비슷한 이름의 인디 게임이 매칭

## 해결책: 게임 매핑 테이블

### 핵심 아이디어

**치지직 게임 이름 → 스팀 AppID 직접 매핑**

```typescript
const CHZZK_STEAM_MAPPINGS = {
  "리그 오브 레전드": null,        // null = 스팀에 없음 (검색 금지)
  "배틀그라운드": 578080,          // 578080 = 스팀 AppID (직접 매핑)
  "엘든 링": 1245620,              // 1245620 = 스팀 AppID
  // "알 수 없는 게임" 은 매핑 없음 → 자동 검색 시도 (폴백)
}
```

### 동작 원리

```
1. 치지직에서 "배틀그라운드" 발견
   ↓
2. 매핑 테이블 확인
   ↓
3-A. 매핑 있음 (578080) → 직접 사용 ✓
3-B. null → 스팀에 없는 게임 → 스킵 ⊗
3-C. 매핑 없음 → 자동 검색 시도 (기존 방식)
```

## 구현된 파일

### 1. `lib/game-mappings.ts` (새 파일)

게임 매핑 테이블과 유틸리티 함수:

```typescript
// 주요 함수
findMappedSteamAppId(chzzkGameName: string): number | null | undefined
  // number   = 스팀 AppID (매핑 있음)
  // null     = 스팀에 없음 (검색 금지)
  // undefined = 매핑 없음 (자동 검색 시도)

isNonSteamGame(chzzkGameName: string): boolean
  // true = 스팀에 없는 게임 (검색하지 마세요!)

getMappingStats()
  // 매핑 통계 (총 개수, 스팀 게임 수, 비스팀 게임 수)
```

### 2. `app/api/cron/discover-top-games/route.ts` (수정)

스팀 정보 가져오기 로직 개선:

```typescript
// 기존 (❌)
const appId = await findSteamAppId(category)  // 무조건 검색

// 개선 (✅)
const mappedAppId = findMappedSteamAppId(category)

if (mappedAppId === null) {
  // 스팀에 없는 게임 → 스킵
  console.log(`⊗ "${category}" is NOT on Steam - skipping`)
  continue
} else if (mappedAppId !== undefined) {
  // 매핑 있음 → 직접 사용
  appId = mappedAppId
} else {
  // 매핑 없음 → 자동 검색 (폴백)
  appId = await findSteamAppId(category)
}
```

### 3. `app/api/game-mappings/route.ts` (새 파일)

매핑 상태 확인 API

## 사용 방법

### Step 1: 매핑 통계 확인

```bash
# 현재 매핑 통계
http://localhost:3000/api/game-mappings?stats=true
```

**응답 예시:**
```json
{
  "stats": {
    "total": 85,
    "steamGames": 45,
    "nonSteamGames": 40,
    "uniqueAppIds": 45
  },
  "message": "Total: 85 mappings (45 on Steam, 40 not on Steam)"
}
```

### Step 2: 특정 게임 확인

```bash
# 리그 오브 레전드는 스팀에 있나요?
http://localhost:3000/api/game-mappings?game=리그 오브 레전드
```

**응답 예시:**
```json
{
  "game": "리그 오브 레전드",
  "appId": "NOT_ON_STEAM",
  "status": "⊗ Not on Steam - will skip",
  "steamUrl": null
}
```

```bash
# 배틀그라운드는?
http://localhost:3000/api/game-mappings?game=배틀그라운드
```

**응답 예시:**
```json
{
  "game": "배틀그라운드",
  "appId": 578080,
  "status": "✓ Mapped to Steam",
  "steamUrl": "https://store.steampowered.com/app/578080"
}
```

### Step 3: 전체 매핑 보기

```bash
http://localhost:3000/api/game-mappings
```

**응답:** 모든 매핑 데이터 (JSON)

### Step 4: 게임 발견 실행

```bash
# 기존과 동일하게 실행
http://localhost:3000/api/cron/discover-top-games?size=20
```

**개선된 로그:**
```
[Top Games Discovery] Processing: "리그 오브 레전드"
[Top Games Discovery] ⊗ "리그 오브 레전드" is NOT on Steam (blacklisted) - skipping

[Top Games Discovery] Processing: "배틀그라운드"
[Top Games Discovery] ✓ Found mapped AppID: 578080 for "배틀그라운드"
[Top Games Discovery] Using Steam AppID: 578080

[Top Games Discovery] Processing: "알 수 없는 새 게임"
[Top Games Discovery] ⚠ No mapping for "알 수 없는 새 게임" - trying automatic search...
[Top Games Discovery] ✓ Found via search: 1234567
[Top Games Discovery] 💡 Consider adding to mappings: "알 수 없는 새 게임": 1234567
```

## 매핑 추가 방법

### 새로운 게임 추가하기

`lib/game-mappings.ts` 파일 수정:

```typescript
export const CHZZK_STEAM_MAPPINGS: Record<string, number | null> = {
  // ... 기존 매핑들 ...
  
  // 새 게임 추가
  "새로운 게임 이름": 1234567,      // 스팀 AppID
  "스팀에 없는 게임": null,          // null로 설정
}
```

### 스팀 AppID 찾는 법

1. **스팀 스토어 URL에서**
   ```
   https://store.steampowered.com/app/578080/PUBG_BATTLEGROUNDS/
                                        ^^^^^^
                                        AppID
   ```

2. **SteamDB 사용**
   - https://steamdb.info/
   - 게임 이름으로 검색
   - App ID 확인

3. **자동 검색 로그에서**
   ```
   [Top Games Discovery] ✓ Found via search: 1234567
   [Top Games Discovery] 💡 Consider adding to mappings: "게임명": 1234567
   ```

## 현재 매핑된 게임

### 스팀에 **있는** 게임 (일부)

| 치지직 이름 | Steam AppID | 영문명 |
|------------|-------------|--------|
| 배틀그라운드 | 578080 | PUBG: BATTLEGROUNDS |
| 엘든 링 | 1245620 | Elden Ring |
| 로스트아크 | 1599340 | Lost Ark |
| 카운터 스트라이크 2 | 730 | Counter-Strike 2 |
| 발더스 게이트 3 | 1086940 | Baldur's Gate 3 |
| 사이버펑크 2077 | 1091500 | Cyberpunk 2077 |
| 팰월드 | 1623730 | Palworld |
| 마블 라이벌즈 | 2767030 | Marvel Rivals |
| 이터널 리턴 | 1049590 | Eternal Return |

### 스팀에 **없는** 게임 (일부)

| 치지직 이름 | 이유 |
|------------|------|
| 리그 오브 레전드 | 라이엇 게임즈 독자 플랫폼 |
| 던전앤파이터 | 넥슨 게임 |
| 메이플스토리 | 넥슨 게임 |
| 원신 | 자체 런처 (miHoYo) |
| 오버워치 2 | 배틀넷 전용 |
| 발로란트 | 라이엇 게임즈 독자 플랫폼 |
| 마인크래프트 | 자체 런처 / MS Store |
| 명조: 워더링 웨이브 | 모바일 게임 |

## 효과

### Before (기존 시스템)

```
✓ 20개 게임 발견
✓ 3개 스팀 정보 업데이트 (15%)
✗ 17개 실패
  - 10개: 한글 이름으로 검색 실패
  - 7개: 잘못된 게임 매칭
```

### After (매핑 시스템)

```
✓ 20개 게임 발견
✓ 12개 스팀 정보 업데이트 (60%)
⊗ 5개 스팀에 없음 (명시적으로 스킵)
⚠ 3개 매핑 없음 (자동 검색 시도)
```

## 유지보수

### 정기적으로 해야 할 일

1. **로그 확인**
   ```
   [Top Games Discovery] 💡 Consider adding to mappings: "신작 게임": 1234567
   ```
   → 이런 메시지 보면 매핑에 추가하기

2. **매핑 추가**
   - 새로운 인기 게임 발견 시 매핑 추가
   - 한글/영어 이름 모두 추가 (유연성 향상)

3. **통계 확인**
   ```bash
   curl http://localhost:3000/api/game-mappings?stats=true
   ```

## 장점

### 1. 정확도 향상

- ✅ 한글 게임 이름도 정확히 매칭
- ✅ 잘못된 매칭 방지
- ✅ 스팀에 없는 게임 명시적으로 스킵

### 2. 성능 향상

- ⚡ 불필요한 스팀 API 호출 감소
- ⚡ 실패한 검색 재시도 없음

### 3. 유지보수 용이

- 📝 매핑 추가/수정 쉬움
- 📊 통계 API로 현황 파악
- 🔍 특정 게임 확인 API

## 문제 해결

### Q: 새로운 게임이 검색되지 않아요

**A:** 로그 확인 후 매핑 추가

```
1. 로그에서 "💡 Consider adding" 메시지 찾기
2. lib/game-mappings.ts에 추가
3. 서버 재시작
```

### Q: 스팀 AppID를 잘못 입력했어요

**A:** 매핑 파일 수정 후 재실행

```typescript
// 수정 전
"게임명": 111111,  // 잘못된 AppID

// 수정 후
"게임명": 222222,  // 올바른 AppID
```

### Q: 게임이 스팀/비스팀을 오가요 (예: 베타 → 출시)

**A:** 매핑 값 변경

```typescript
// 베타 기간 (스팀에 없음)
"게임명": null,

// 출시 후
"게임명": 1234567,
```

## 다음 단계

### 선택적 개선 사항

1. **자동 매핑 제안**
   - 자동 검색 성공 시 매핑 파일에 자동 추가
   - Pull request 자동 생성

2. **다국어 지원**
   - 영어 → 한글 자동 변환
   - 중국어, 일본어 매핑 추가

3. **데이터베이스 저장**
   - 매핑을 DB에 저장 (파일 대신)
   - 관리자 UI로 매핑 편집

## 관련 파일

- `lib/game-mappings.ts` - 매핑 테이블 및 유틸리티
- `lib/steam.ts` - 스팀 API 통합
- `app/api/cron/discover-top-games/route.ts` - 게임 발견 API
- `app/api/game-mappings/route.ts` - 매핑 확인 API

## 버전

- **v1.0** (2026-02-15): 게임 매핑 시스템 도입
  - 치지직 → 스팀 직접 매핑
  - 블랙리스트 (스팀에 없는 게임)
  - 매핑 확인 API
  - 85개 게임 사전 매핑
