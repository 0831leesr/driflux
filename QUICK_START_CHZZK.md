# 치지직 연동 빠른 시작 가이드 ⚡

**⚠️ API 엔드포인트 변경 (2026-02-15):**
- Polling V2 API 사용 (`/polling/v2/channels/{id}/live-status`)
- Error 9004 문제 해결됨
- 간단한 헤더로 안정적인 데이터 수집 가능

---

## 1단계: DB 스키마 추가 (Supabase)

Supabase SQL Editor에서 실행:

```sql
-- 1. 기본 컬럼 추가 (sql/03_add_chzzk_fields.sql)
ALTER TABLE streams 
ADD COLUMN IF NOT EXISTS chzzk_channel_id TEXT,
ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS viewer_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_chzzk_update TIMESTAMPTZ;

-- 2. 카테고리 컬럼 추가 (sql/04_add_stream_category.sql) ← 추가!
ALTER TABLE streams 
ADD COLUMN IF NOT EXISTS stream_category TEXT;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_streams_chzzk_channel_id 
ON streams(chzzk_channel_id) WHERE chzzk_channel_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_streams_is_live 
ON streams(is_live) WHERE is_live = true;

CREATE INDEX IF NOT EXISTS idx_streams_stream_category 
ON streams(stream_category) WHERE stream_category IS NOT NULL;
```

**또는 파일 실행:**
1. `sql/03_add_chzzk_fields.sql` - 기본 컬럼
2. `sql/04_add_stream_category.sql` - 카테고리 컬럼

---

## 2단계: 테스트 데이터 삽입

### 실제 치지직 채널 ID 예시 (2026년 2월 기준)

> **채널 ID 찾는 방법:**
> 1. 치지직에서 스트리머 페이지 방문
> 2. URL 확인: `https://chzzk.naver.com/live/[32자 ID]`
> 3. 32자 hexadecimal 문자열이 채널 ID

### 추천 테스트 채널

```sql
-- 테스트 스트림 추가 (실제 채널 ID로 교체 필요)
INSERT INTO streams (title, streamer_name, chzzk_channel_id, is_live, viewer_count)
VALUES 
  ('테스트 방송 1', '한동숙', 'c1f0a24755fb3e583fb0a588f921c84b', false, 0),
  ('테스트 방송 2', '풍월량', 'eb4dbcb2e538c5345e7c3f48c849518d', false, 0);
```

**또는 기존 스트림에 추가:**

```sql
UPDATE streams 
SET chzzk_channel_id = 'c1f0a24755fb3e583fb0a588f921c84b' 
WHERE id = 1;
```

---

## 3단계: API 테스트

### 개발 서버 실행
```bash
npm run dev
```

### API 호출
```bash
# 브라우저에서:
http://localhost:3000/api/cron/update-streams

# 또는 curl:
curl http://localhost:3000/api/cron/update-streams
```

### 특정 채널만 테스트
```bash
http://localhost:3000/api/cron/update-streams?channelId=c1f0a24755fb3e583fb0a588f921c84b
```

---

## 4단계: 결과 확인

### 예상 응답

```json
{
  "success": true,
  "message": "Updated 2 of 2 streams (1 live, 1 offline)",
  "stats": {
    "total": 2,
    "updated": 2,
    "failed": 0,
    "live": 1,
    "offline": 1
  },
  "details": [
    {
      "id": 1,
      "title": "한동숙 LOL 방송",
      "chzzk_channel_id": "c1f0a24755fb3e583fb0a588f921c84b",
      "status": "updated",
      "is_live": true,
      "viewer_count": 15234
    }
  ]
}
```

### 터미널 로그 확인

**정상 작동 시 (LIVE):**
```
[Chzzk API] ========================================
[Chzzk API] Fetching channel: c1f0a24755fb3e583fb0a588f921c84b
[Chzzk API] Request URL: https://api.chzzk.naver.com/service/v1/channels/.../live-detail
[Chzzk API] Response Status: 200 OK
[Chzzk API] Response Headers: { content-type: 'application/json', ... }
[Chzzk API] Raw Response Data: { code: 200, message: null, content: { ... } }
[Chzzk API] API Response Code: 200
[Chzzk API] Content status: OPEN
[Chzzk API] Live title: 한동숙 LOL 방송
[Chzzk API] Thumbnail URL: https://.../image_720.jpg
[Chzzk API] ✓ Channel is LIVE!
[Chzzk API]   Title: 한동숙 LOL 방송
[Chzzk API]   Viewers: 15,234
[Chzzk API]   Category: 게임
[Chzzk API] ========================================
```

**정상 작동 시 (OFFLINE):**
```
[Chzzk API] ========================================
[Chzzk API] Fetching channel: eb4dbcb2e538c5345e7c3f48c849518d
[Chzzk API] Response Status: 200 OK
[Chzzk API] API Response Code: 200
[Chzzk API] Content status: CLOSE
[Chzzk API] ✓ Channel is OFFLINE (status: CLOSE)
[Chzzk API] Creating offline status for channel...
[Chzzk API] ========================================
```

**에러 발생 시:**
```
[Chzzk API] ✗ HTTP Error: 403 Forbidden
[Chzzk API] Error Response Body: ...
→ User-Agent 차단 문제 (코드가 수정되었으면 해결됨)

[Chzzk API] ✗ Invalid response structure (no code field)
→ API 응답 구조가 예상과 다름 (raw data 로그 확인)

[Chzzk API] ✗ Content is null (channel may not exist or be private)
→ 잘못된 채널 ID이거나 비공개 채널
```

---

## 5단계: DB 확인

Supabase에서 업데이트 확인:

```sql
SELECT 
  id, 
  title, 
  streamer_name,
  chzzk_channel_id,
  is_live, 
  viewer_count,
  last_chzzk_update
FROM streams
WHERE chzzk_channel_id IS NOT NULL
ORDER BY viewer_count DESC;
```

---

## 실제 채널 ID 찾는 방법

### 방법 1: 브라우저에서 직접 확인 (가장 쉬움!)

1. https://chzzk.naver.com 접속
2. 원하는 스트리머 검색 (예: "한동숙", "풍월량")
3. 스트리머 프로필 또는 방송 페이지 클릭
4. 브라우저 주소창의 URL에서 32자 ID 복사
   ```
   https://chzzk.naver.com/live/c1f0a24755fb3e583fb0a588f921c84b
                                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                 이 부분이 Channel ID (32자 hex)
   
   또는
   
   https://chzzk.naver.com/c1f0a24755fb3e583fb0a588f921c84b
                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   ```

**주의**: 
- `/live/` 다음에 오는 32자 문자열이 Channel ID입니다
- 방송 중이 아니어도 채널 ID는 항상 동일합니다
- 0-9, a-f 문자로만 이루어진 hexadecimal 문자열입니다

### 방법 2: API로 확인 (개발자 도구)

1. 치지직 웹사이트 접속
2. F12 (개발자 도구) → Network 탭
3. 스트리머 검색 또는 클릭
4. XHR/Fetch 요청에서 `channels` API 확인
5. Response에서 `channelId` 값 확인

### 방법 3: 이 프로젝트 코드로 테스트

```typescript
// lib/chzzk.ts에 임포트된 함수 사용
import { getChzzkLiveStatus } from "@/lib/chzzk"

const test = await getChzzkLiveStatus("테스트할_채널_ID")
console.log(test)
```

---

## 인기 스트리머 예시 (참고용)

> **주의**: 실제 채널 ID는 스트리머별로 다르며, 위 방법으로 직접 확인해야 합니다.

예상 형식:
- 한동숙: `c1f0a24755fb3e583fb0a588f921c84b` (예시)
- 풍월량: `eb4dbcb2e538c5345e7c3f48c849518d` (예시)
- 김뚜띠: `80e26df17c1d0d7c5b7c2c32be6ecf2a` (예시)
- 서새봄: `4d0b7d3f825ea982b95f0a5c2b4782d3` (예시)
- 괴물쥐: `17f0cfcba4ff608de5eabb5110d134d0` (예시)

**실제 ID는 위와 다를 수 있으니 반드시 확인하세요!**

---

## 트러블슈팅

### ❌ "No streams with chzzk_channel_id found"
→ DB에 `chzzk_channel_id`가 설정된 스트림이 없음
→ 2단계 다시 확인

### ❌ "Missing Supabase credentials"
→ `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY` 추가 필요

### ❌ "HTTP Error: 403 Forbidden"
→ Naver 서버가 봇으로 인식하여 차단
→ **해결됨**: User-Agent를 실제 브라우저로 변경 (코드에 이미 적용됨)
→ 캐시 문제일 수 있음: 개발 서버 재시작

### ❌ "Error 9004: 앱 업데이트 후에 정상 시청 가능합니다"
→ 구형 클라이언트로 인식되어 차단됨
→ **해결됨**: Chrome 121 헤더 + Sec-Ch-Ua 헤더 추가 (코드에 이미 적용됨)
→ 반드시 개발 서버 **완전 재시작** 필요 (Ctrl+C → npm run dev)
→ 터미널에서 `ERROR 9004 DETECTED` 메시지 확인

### ❌ "Channel returned no content" 또는 "Content is null"
→ 잘못된 채널 ID이거나 존재하지 않는 채널
→ 채널 ID 다시 확인 (32자 hexadecimal 문자열인지)
→ 치지직 웹사이트에서 해당 채널이 실제로 존재하는지 확인

### ❌ 모든 채널이 "OFFLINE"으로 표시됨
→ 터미널 로그에서 `Raw Response Data` 확인
→ `content.status` 값이 실제로 "CLOSE"인지 확인
→ 실제로 방송 중인 채널로 테스트 (치지직 메인 페이지에서 라이브 중인 채널 확인)

### ❌ DB는 업데이트되지 않음
→ RLS 정책 문제
→ Service Role Key가 올바른지 확인
→ Admin client 초기화 로그 확인 (`✓ Admin client initialized` 있는지)

### ❌ "Invalid response structure"
→ API 응답 구조가 변경되었을 가능성
→ 터미널의 `Raw Response Data` 로그를 확인하여 실제 구조 파악
→ GitHub Issue 생성하여 보고

---

## 자동 업데이트 (Vercel Cron)

`vercel.json` 이미 설정됨:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-streams",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

배포 후 **5분마다** 자동 업데이트됩니다.

---

## 다음 단계

- [ ] 프론트엔드에서 라이브 스트림 표시
- [ ] 시청자 수 실시간 업데이트
- [ ] 라이브/오프라인 필터링
- [ ] 스트리머 알림 기능

---

**작성일**: 2026-02-15  
**소요 시간**: ~5분
