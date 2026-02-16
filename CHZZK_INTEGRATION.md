# 치지직(Chzzk) 라이브 스트림 연동 가이드

## 📋 개요

이 문서는 Driflux에 치지직 라이브 스트리밍 데이터를 연동하는 방법을 설명합니다.

**⚠️ API 엔드포인트 변경 (2026-02-15):**
- 기존: `service/v1/channels/{id}/live-detail` → Error 9004 발생
- 변경: `polling/v2/channels/{id}/live-status` → 봇 차단 회피

---

## 🚀 설치 및 설정

### 1. 데이터베이스 마이그레이션

Supabase SQL Editor에서 다음 파일을 실행하세요:

```sql
-- sql/03_add_chzzk_fields.sql
```

이 스크립트는 다음 컬럼을 `streams` 테이블에 추가합니다:
- `chzzk_channel_id` (TEXT): 치지직 채널 고유 ID
- `is_live` (BOOLEAN): 현재 라이브 방송 중 여부
- `viewer_count` (INTEGER): 실시간 시청자 수
- `last_chzzk_update` (TIMESTAMPTZ): 마지막 업데이트 시간

### 2. 환경 변수 확인

`.env.local` 파일에 다음 변수가 설정되어 있는지 확인하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # RLS 우회용
```

---

## 🎮 테스트 데이터 삽입

### 실제 치지직 채널 ID 예시

다음은 실제로 작동하는 인기 스트리머들의 채널 ID입니다:

#### 1. **한동숙 (HandongSook)**
- Channel ID: `c1f0a24755fb3e583fb0a588f921c84b`
- URL: https://chzzk.naver.com/live/c1f0a24755fb3e583fb0a588f921c84b
- 설명: LOL, 게임 방송

#### 2. **풍월량 (PungwolRyang)**
- Channel ID: `eb4dbcb2e538c5345e7c3f48c849518d`
- URL: https://chzzk.naver.com/live/eb4dbcb2e538c5345e7c3f48c849518d
- 설명: 게임, 토크 방송

#### 3. **김뚜띠 (KimDdutti)**
- Channel ID: `80e26df17c1d0d7c5b7c2c32be6ecf2a`
- URL: https://chzzk.naver.com/live/80e26df17c1d0d7c5b7c2c32be6ecf2a
- 설명: LOL 방송

### Supabase에 테스트 데이터 삽입

```sql
-- streams 테이블에 테스트 스트리머 추가
INSERT INTO streams (title, streamer_name, chzzk_channel_id, is_live, viewer_count)
VALUES 
  ('한동숙 방송', '한동숙', 'c1f0a24755fb3e583fb0a588f921c84b', false, 0),
  ('풍월량 방송', '풍월량', 'eb4dbcb2e538c5345e7c3f48c849518d', false, 0),
  ('김뚜띠 방송', '김뚜띠', '80e26df17c1d0d7c5b7c2c32be6ecf2a', false, 0);
```

또는 기존 스트림에 채널 ID 추가:

```sql
-- 기존 스트림에 치지적 채널 ID 추가
UPDATE streams SET chzzk_channel_id = 'c1f0a24755fb3e583fb0a588f921c84b' WHERE streamer_name = '한동숙';
UPDATE streams SET chzzk_channel_id = 'eb4dbcb2e538c5345e7c3f48c849518d' WHERE streamer_name = '풍월량';
UPDATE streams SET chzzk_channel_id = '80e26df17c1d0d7c5b7c2c32be6ecf2a' WHERE streamer_name = '김뚜띠';
```

---

## 🧪 API 테스트

### 개발 서버 실행

```bash
npm run dev
```

### API 엔드포인트

#### 1. 전체 스트림 업데이트
```bash
GET http://localhost:3000/api/cron/update-streams
```

#### 2. 특정 채널만 업데이트
```bash
GET http://localhost:3000/api/cron/update-streams?channelId=c1f0a24755fb3e583fb0a588f921c84b
```

#### 3. 개수 제한
```bash
GET http://localhost:3000/api/cron/update-streams?limit=5
```

### 예상 응답

```json
{
  "success": true,
  "message": "Updated 3 of 3 streams (1 live, 2 offline)",
  "stats": {
    "total": 3,
    "updated": 3,
    "failed": 0,
    "live": 1,
    "offline": 2
  },
  "details": [
    {
      "id": 1,
      "title": "한동숙 LOL 방송",
      "chzzk_channel_id": "c1f0a24755fb3e583fb0a588f921c84b",
      "streamer_name": "한동숙",
      "status": "updated",
      "is_live": true,
      "viewer_count": 15234
    }
  ],
  "duration": 3456
}
```

---

## 🔍 API 사용법 (코드 레벨)

### lib/chzzk.ts

```typescript
import { getChzzkLiveStatus, getChzzkLiveStatusBatch } from "@/lib/chzzk"

// 단일 채널 조회
const liveData = await getChzzkLiveStatus("c1f0a24755fb3e583fb0a588f921c84b")
console.log(liveData.is_live) // true or false
console.log(liveData.viewer_count) // 15234

// 여러 채널 일괄 조회 (Rate Limit 자동 처리)
const channels = ["c1f0a24755fb3e583fb0a588f921c84b", "eb4dbcb2e538c5345e7c3f48c849518d"]
const results = await getChzzkLiveStatusBatch(channels)
```

### 유틸리티 함수

```typescript
import { 
  formatViewerCount, 
  getChzzkChannelUrl, 
  processChzzkImageUrl 
} from "@/lib/chzzk"

// 시청자 수 포맷 (한국어)
formatViewerCount(15234) // "1.5만명"
formatViewerCount(523) // "523명"

// 채널 URL 생성
getChzzkChannelUrl("c1f0a24755fb3e583fb0a588f921c84b")
// → "https://chzzk.naver.com/live/c1f0a24755fb3e583fb0a588f921c84b"

// 썸네일 이미지 URL 처리
processChzzkImageUrl("https://.../{type}/image.jpg", "720")
// → "https://.../720/image.jpg"
```

---

## 📊 데이터 구조

### ChzzkApiResponse (원본 API 응답)

```typescript
{
  code: 200,
  message: null,
  content: {
    liveTitle: "한동숙 LOL 방송",
    status: "OPEN",  // "OPEN" (라이브 중) | "CLOSE" (종료)
    liveImageUrl: "https://.../image_{type}.jpg",
    concurrentUserCount: 15234,
    liveCategory: "게임",
    openDate: "2026-02-15T10:30:00Z"
  }
}
```

### ProcessedChzzkData (가공된 데이터)

```typescript
{
  chzzk_channel_id: "c1f0a24755fb3e583fb0a588f921c84b",
  title: "한동숙 LOL 방송",
  thumbnail_url: "https://.../image_480.jpg",
  is_live: true,
  viewer_count: 15234,
  category: "게임"
}
```

---

## ⏱️ 자동 업데이트 설정 (Vercel Cron)

### vercel.json

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

위 설정은 **5분마다** 자동으로 치지직 데이터를 업데이트합니다.

- `*/1 * * * *` - 1분마다 (높은 빈도, 트래픽 주의)
- `*/5 * * * *` - 5분마다 (권장)
- `*/15 * * * *` - 15분마다 (낮은 빈도)

---

## 🐛 디버깅

### 터미널 로그 확인

API를 호출하면 다음과 같은 로그가 출력됩니다:

```
[Chzzk Update] Starting update job...
[Chzzk Update] ✓ Admin client initialized with Service Role Key
[Chzzk Update] Found 3 streams to update
[Chzzk API] Fetching channel c1f0a24755fb3e583fb0a588f921c84b...
Chzzk API Raw Data: { ... }  ← 실제 API 응답
[Chzzk API] ✓ Channel c1f0a24755fb3e583fb0a588f921c84b is LIVE: 한동숙 LOL 방송
[Chzzk Update] ✓ Updated: 한동숙 방송 (LIVE)
```

### 일반적인 문제 해결

#### 1. "Missing Supabase credentials" 에러
→ `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY`가 설정되어 있는지 확인

#### 2. "Database update failed: new row violates row-level security policy"
→ Admin client가 제대로 초기화되지 않음. Service Role Key 확인

#### 3. "Channel returned no content"
→ 잘못된 채널 ID이거나 해당 채널이 삭제됨

#### 4. API가 느림
→ Rate Limit 설정 확인 (`RATE_LIMIT_DELAY` in `lib/chzzk.ts`)

---

## 📌 추가 참고

### 치지직 채널 ID 찾는 방법

1. 치지직 웹사이트에서 스트리머 채널 방문
2. URL에서 채널 ID 확인
   ```
   https://chzzk.naver.com/live/c1f0a24755fb3e583fb0a588f921c84b
                                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                 이 부분이 Channel ID
   ```

### API Rate Limit

치지직 API는 공식 문서가 없으나, 일반적으로:
- 요청당 1초 간격 권장 (현재 설정)
- 과도한 요청 시 일시적 차단 가능

---

## ✅ 체크리스트

- [ ] SQL 마이그레이션 실행 (`03_add_chzzk_fields.sql`)
- [ ] 환경 변수 설정 확인 (`.env.local`)
- [ ] 테스트 데이터 삽입 (최소 1개 채널)
- [ ] API 수동 테스트 (`/api/cron/update-streams`)
- [ ] 실시간 방송 중인 채널로 테스트
- [ ] Vercel Cron 설정 (배포 시)

---

## 🔗 관련 파일

- `lib/chzzk.ts` - 치지직 API 유틸리티
- `app/api/cron/update-streams/route.ts` - 업데이트 API 라우트
- `sql/03_add_chzzk_fields.sql` - DB 마이그레이션
- `vercel.json` - Cron 설정

---

**작성일**: 2026-02-15  
**버전**: 1.0.0
