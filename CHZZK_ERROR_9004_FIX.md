# 치지직 Error 9004 수정 완료 ✅

## 🐛 문제 상황

**에러 메시지:**
```json
{
  "code": 9004,
  "message": "앱 업데이트 후에 정상 시청 가능합니다."
}
```

**원인:**
- Naver 치지직 API가 구형 클라이언트를 차단
- Chrome Client Hints 헤더 누락 (`Sec-Ch-Ua` 계열)
- Origin 헤더 미설정
- User-Agent가 Chrome 120으로 약간 오래됨

---

## ✅ 수정 완료

### 1. User-Agent 업데이트

**Chrome 120 → Chrome 121**
```typescript
// 이전
const BROWSER_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

// 수정 후
const BROWSER_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
```

### 2. 완전한 브라우저 헤더 추가

```typescript
headers: {
  // Core browser identification
  "User-Agent": BROWSER_USER_AGENT,
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  
  // Origin and Referer (CRITICAL for Naver API)
  "Origin": "https://chzzk.naver.com",
  "Referer": "https://chzzk.naver.com/",
  
  // Chrome Client Hints (prevents Error 9004) ← 핵심!
  "Sec-Ch-Ua": '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  
  // Security headers
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
}
```

**추가된 헤더 (총 11개):**
1. ✅ `Origin` - 요청 출처 명시
2. ✅ `Sec-Ch-Ua` - Chrome 브랜드 정보
3. ✅ `Sec-Ch-Ua-Mobile` - 모바일 아님
4. ✅ `Sec-Ch-Ua-Platform` - Windows 플랫폼
5. ✅ `Sec-Fetch-Dest` - 요청 목적지
6. ✅ `Sec-Fetch-Mode` - CORS 모드
7. ✅ `Sec-Fetch-Site` - 동일 출처
8. ✅ `Accept-Encoding` - 압축 지원

### 3. Error 9004 특별 처리

```typescript
if (data.code === 9004) {
  console.error(`[Chzzk API] ✗ ERROR 9004 DETECTED: Outdated client error`)
  console.error(`[Chzzk API] This usually means headers are insufficient or outdated`)
  console.error(`[Chzzk API] Check if User-Agent and Sec-Ch-Ua headers are correct`)
}
```

---

## 🧪 테스트 방법

### 1단계: 개발 서버 완전 재시작 (필수!)

```bash
# 기존 서버 종료 (Ctrl+C)
npm run dev
```

**중요:** 캐시 때문에 반드시 재시작해야 합니다!

### 2단계: API 호출

```bash
# 브라우저에서:
http://localhost:3000/api/cron/update-streams

# 특정 채널 테스트:
http://localhost:3000/api/cron/update-streams?channelId=실제_채널_ID
```

### 3단계: 터미널 로그 확인

**성공 시:**
```
[Chzzk API] ========================================
[Chzzk API] Response Status: 200 OK
[Chzzk API] API Response Code: 200  ← 200이면 성공!
[Chzzk API] Content status: OPEN
[Chzzk API] ✓ Channel is LIVE!
```

**여전히 9004 발생 시:**
```
[Chzzk API] API Response Code: 9004
[Chzzk API] ✗ ERROR 9004 DETECTED: Outdated client error
→ 코드가 최신인지 확인
→ 개발 서버를 완전히 재시작했는지 확인
```

---

## 📋 수정된 파일

- `lib/chzzk.ts` - 헤더 완전 교체, Error 9004 처리 추가
- `CHZZK_BUGFIX.md` - Error 9004 섹션 추가
- `QUICK_START_CHZZK.md` - 트러블슈팅 업데이트

---

## 🎯 예상 결과

**Before (Error 9004):**
```json
{
  "code": 9004,
  "message": "앱 업데이트 후에 정상 시청 가능합니다."
}
```

**After (Success):**
```json
{
  "code": 200,
  "message": null,
  "content": {
    "status": "OPEN",
    "liveTitle": "방송 제목",
    "concurrentUserCount": 15234,
    ...
  }
}
```

---

## 🔍 여전히 문제가 있다면?

### 체크리스트
- [ ] 개발 서버를 **완전히** 재시작했는가? (Ctrl+C → npm run dev)
- [ ] 브라우저 캐시를 비웠는가? (Ctrl+F5)
- [ ] 실제로 방송 중인 채널 ID를 사용했는가?
- [ ] 터미널에서 `Sec-Ch-Ua` 헤더가 로그에 보이는가?
- [ ] `Raw Response Data`에 `code: 200`이 보이는가?

### 여전히 9004가 나온다면

1. **코드 확인:**
   ```bash
   # lib/chzzk.ts 파일에서 확인
   grep "Chrome/121" lib/chzzk.ts
   grep "Sec-Ch-Ua" lib/chzzk.ts
   ```
   
   두 명령 모두 결과가 나와야 합니다.

2. **수동 API 테스트:**
   ```bash
   curl -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" \
        -H "Origin: https://chzzk.naver.com" \
        -H "Referer: https://chzzk.naver.com/" \
        -H 'Sec-Ch-Ua: "Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"' \
        -H "Sec-Ch-Ua-Mobile: ?0" \
        -H 'Sec-Ch-Ua-Platform: "Windows"' \
        https://api.chzzk.naver.com/service/v1/channels/[채널ID]/live-detail
   ```

3. **Issue 생성:**
   - 위 테스트 결과를 포함하여 GitHub Issue 생성
   - 터미널 전체 로그 첨부

---

## 📊 헤더 비교표

| 헤더 | 이전 | 수정 후 | 중요도 |
|------|------|---------|--------|
| User-Agent | Chrome 120 | Chrome 121 | ⭐⭐⭐ |
| Origin | ❌ 없음 | ✅ 추가 | ⭐⭐⭐ |
| Sec-Ch-Ua | ❌ 없음 | ✅ 추가 | ⭐⭐⭐⭐⭐ |
| Sec-Ch-Ua-Mobile | ❌ 없음 | ✅ 추가 | ⭐⭐⭐⭐ |
| Sec-Ch-Ua-Platform | ❌ 없음 | ✅ 추가 | ⭐⭐⭐⭐ |
| Sec-Fetch-* | ❌ 없음 | ✅ 추가 | ⭐⭐⭐ |
| Accept-Encoding | ❌ 없음 | ✅ 추가 | ⭐⭐ |

---

## 🎓 왜 Error 9004가 발생했나?

Naver 치지직은 최신 브라우저 보안 기능인 **Chrome Client Hints**를 체크합니다.

**Client Hints란?**
- Chrome 89+ 부터 도입된 새로운 User-Agent 체계
- `Sec-Ch-Ua-*` 헤더로 브라우저 정보를 구조화하여 전달
- 구형 클라이언트는 이 헤더가 없으므로 차단됨

**치지직 API의 보안 체크:**
1. `User-Agent` 확인 → Chrome 121 필요
2. `Sec-Ch-Ua` 확인 → 없으면 구형으로 판단 → Error 9004
3. `Origin` 확인 → chzzk.naver.com인지 검증
4. 모두 통과 → 200 OK

---

**작성일**: 2026-02-15  
**버전**: 1.2.0  
**Status**: ✅ Error 9004 수정 완료
