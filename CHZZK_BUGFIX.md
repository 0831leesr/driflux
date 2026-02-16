# 치지직 연동 버그 수정 (2026-02-15)

## 🐛 문제 상황

### Issue #1: 모든 방송이 "Offline"으로 표시
**원인:**
- Naver API가 봇 User-Agent를 차단
- 썸네일 이미지 처리 미흡
- 디버깅 로그 부족

### Issue #2: Error 9004 - "앱 업데이트 후에 정상 시청 가능합니다"
**원인:**
- 구형 클라이언트로 인식됨
- Chrome Client Hints 헤더 누락 (Sec-Ch-Ua 계열)
- Origin 헤더 미설정

---

## ✅ 수정 사항

### 1. User-Agent 및 헤더 완전 교체 (Error 9004 해결)

**이전 (Chrome 120, 기본 헤더만):**
```typescript
const BROWSER_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

headers: {
  "User-Agent": BROWSER_USER_AGENT,
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "Referer": "https://chzzk.naver.com/",
}
```

**수정 후 (Chrome 121, 완전한 브라우저 헤더):**
```typescript
const BROWSER_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"

headers: {
  // Core browser identification
  "User-Agent": BROWSER_USER_AGENT,
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  
  // Origin and Referer (CRITICAL for Naver API)
  "Origin": "https://chzzk.naver.com",
  "Referer": "https://chzzk.naver.com/",
  
  // Chrome Client Hints (prevents Error 9004)
  "Sec-Ch-Ua": '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  
  // Security headers
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
}
```

**주요 변경점:**
- ✅ Chrome 120 → 121로 업데이트
- ✅ `Origin` 헤더 추가 (필수!)
- ✅ `Sec-Ch-Ua` 계열 헤더 추가 (Error 9004 방지)
- ✅ `Sec-Fetch-*` 보안 헤더 추가
- ✅ `Accept-Encoding` 추가

### 2. 썸네일 처리 개선

**이전:** 기본 해상도 480
**수정 후:** 기본 해상도 720 (고화질)

```typescript
const DEFAULT_THUMBNAIL_SIZE = "720"

// {type} placeholder를 720으로 치환
thumbnailUrl = content.liveImageUrl.replace("{type}", "720")
```

### 3. 상세 디버깅 로그 추가

**추가된 로그:**
- HTTP Response Status & Headers
- 전체 API Raw Response Data
- API Response Code 및 Message
- Content Status 및 Title
- 에러 발생 시 상세 스택 트레이스

**로그 예시:**
```
[Chzzk API] ========================================
[Chzzk API] Fetching channel: c1f0a24755fb3e583fb0a588f921c84b
[Chzzk API] Response Status: 200 OK
[Chzzk API] Raw Response Data: { code: 200, content: { ... } }
[Chzzk API] Content status: OPEN
[Chzzk API] ✓ Channel is LIVE!
[Chzzk API] ========================================
```

### 4. 에러 처리 강화

- Content null 체크 강화
- API code 검증 추가
- Response structure 검증
- 예외 발생 시 상세 정보 출력
- **Error 9004 특별 처리 추가**

```typescript
if (data.code !== 200) {
  console.error(`[Chzzk API] ✗ API returned non-200 code: ${data.code}`)
  console.error(`[Chzzk API] Error Message: ${data.message}`)
  
  // Special handling for Error 9004 (outdated client)
  if (data.code === 9004) {
    console.error(`[Chzzk API] ✗ ERROR 9004 DETECTED: Outdated client error`)
    console.error(`[Chzzk API] This usually means headers are insufficient or outdated`)
    console.error(`[Chzzk API] Check if User-Agent and Sec-Ch-Ua headers are correct`)
  }
  
  return createOfflineStatus(channelId)
}
```

- Error Response Body 출력 길이: 500자 → 1000자로 증가

---

## 🧪 테스트 방법

### 1단계: 개발 서버 재시작

**중요**: 캐시 문제를 피하기 위해 반드시 재시작!

```bash
# 서버 종료 (Ctrl+C)
npm run dev
```

### 2단계: 실제 라이브 중인 채널 찾기

1. https://chzzk.naver.com 접속
2. 메인 페이지에서 **현재 방송 중인** 스트리머 찾기
3. 방송 클릭 → URL에서 채널 ID 복사

```
https://chzzk.naver.com/live/[32자_채널_ID]
```

### 3단계: DB에 채널 ID 추가

```sql
-- 테스트용 스트림 추가
INSERT INTO streams (title, streamer_name, chzzk_channel_id)
VALUES ('테스트 방송', '테스트 스트리머', '실제_라이브_중인_채널_ID');

-- 또는 기존 스트림 업데이트
UPDATE streams 
SET chzzk_channel_id = '실제_라이브_중인_채널_ID' 
WHERE id = 1;
```

### 4단계: API 호출

```bash
# 브라우저에서:
http://localhost:3000/api/cron/update-streams

# 또는 특정 채널만:
http://localhost:3000/api/cron/update-streams?channelId=실제_채널_ID
```

### 5단계: 터미널 로그 확인

**성공 시 보여야 하는 로그:**

```
[Chzzk Update] Found 1 streams to update
[Chzzk Update] Channel IDs: [{ id: 1, title: '...', channel_id: '...' }]

[Chzzk API] ========================================
[Chzzk API] Fetching channel: ...
[Chzzk API] Response Status: 200 OK
[Chzzk API] API Response Code: 200
[Chzzk API] Content status: OPEN  ← 라이브 중이면 OPEN
[Chzzk API] ✓ Channel is LIVE!
[Chzzk API]   Title: [방송 제목]
[Chzzk API]   Viewers: [시청자 수]
[Chzzk API] ========================================

[Chzzk Update] ✓ Updated: [방송 제목] (LIVE)
```

### 6단계: DB 확인

```sql
SELECT 
  id, 
  title, 
  streamer_name,
  is_live,
  viewer_count,
  last_chzzk_update
FROM streams
WHERE chzzk_channel_id IS NOT NULL;
```

**확인 사항:**
- `is_live`: 실제 방송 중이면 `true`
- `viewer_count`: 0보다 큰 숫자
- `last_chzzk_update`: 방금 업데이트된 시간

---

## 🔍 여전히 문제가 있다면?

### Error 9004 발생 시

**증상:**
```json
{
  "code": 9004,
  "message": "앱 업데이트 후에 정상 시청 가능합니다."
}
```

**해결 방법:**
1. ✅ 코드가 최신인지 확인 (Chrome 121 헤더 적용되었는지)
2. ✅ 개발 서버 완전 재시작 (캐시 제거)
3. ✅ 터미널에서 `ERROR 9004 DETECTED` 로그 확인
4. ✅ `Sec-Ch-Ua` 헤더가 요청에 포함되었는지 확인

### 체크리스트

- [ ] 개발 서버를 재시작했는가?
- [ ] 실제로 **지금 방송 중인** 채널 ID를 사용했는가?
- [ ] 채널 ID가 정확한가? (32자 hexadecimal)
- [ ] `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY`가 있는가?
- [ ] 터미널에서 `Raw Response Data` 로그를 확인했는가?
- [ ] Error 9004가 발생했다면 헤더가 최신 버전인가?

### 디버깅 팁

1. **Raw Response Data 확인**
   - 터미널에서 `Chzzk API Raw Data:` 로그 찾기
   - `content` 객체가 있는지 확인
   - `content.status` 값 확인 ("OPEN" or "CLOSE")

2. **수동 API 테스트**
   ```bash
   # PowerShell에서:
   curl -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" `
        https://api.chzzk.naver.com/service/v1/channels/[채널ID]/live-detail
   ```

3. **채널 ID 재확인**
   - 치지직 웹사이트에서 해당 채널이 실제로 존재하는지 확인
   - 브라우저 주소창에서 정확히 32자인지 확인

---

## 📝 변경된 파일

- `lib/chzzk.ts` - User-Agent 변경, 로그 추가, 썸네일 개선
- `app/api/cron/update-streams/route.ts` - 채널 목록 로그 추가
- `QUICK_START_CHZZK.md` - 트러블슈팅 가이드 업데이트

---

## 🎯 예상 결과

**이전:** 모든 채널 OFFLINE  
**수정 후:** 실제 라이브 상태 반영

- 라이브 중인 채널: `is_live: true`, `viewer_count > 0`
- 방송 종료: `is_live: false`, `viewer_count: 0`

---

**작성일**: 2026-02-15  
**수정자**: AI Assistant  
**버전**: 1.1.0
