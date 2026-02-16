# 초기 데이터 설정 가이드

## 문제 상황

Cron Jobs 보안 설정 후 메인 페이지나 Explore 탭에 아무것도 표시되지 않는 경우, **데이터베이스가 비어있어서** 발생하는 문제입니다.

## 데이터 흐름 이해하기

```
┌─────────────────────────────────────────────────┐
│ 1. Cron Jobs (백그라운드 데이터 수집)            │
│    /api/cron/discover-top-games                  │
│    /api/cron/update-streams                      │
│    /api/cron/update-steam                        │
├─────────────────────────────────────────────────┤
│              ⬇ DB에 데이터 저장                   │
├─────────────────────────────────────────────────┤
│ 2. Supabase Database                            │
│    • games 테이블 (게임 정보)                     │
│    • streams 테이블 (실시간 스트리밍 정보)         │
│    • tags 테이블 (태그 정보)                      │
├─────────────────────────────────────────────────┤
│              ⬆ 프론트엔드가 직접 조회              │
├─────────────────────────────────────────────────┤
│ 3. Frontend (Next.js)                           │
│    lib/data.ts → Supabase 직접 쿼리              │
│    components → 화면에 표시                      │
└─────────────────────────────────────────────────┘
```

**중요:** 프론트엔드는 API 라우트를 호출하지 않고, **Supabase를 직접 쿼리**합니다.  
따라서 Cron Jobs가 실행되어 DB에 데이터가 채워져야 화면에 표시됩니다.

---

## 해결 방법: 초기 데이터 수동 로드

개발 서버를 실행한 상태에서 다음 Cron 엔드포인트를 **수동으로 호출**하여 데이터를 채웁니다.

### 1단계: discover-top-games (필수, 최우선)

**이 엔드포인트가 가장 중요합니다.**  
치지직에서 인기 게임 카테고리와 스트리밍을 자동으로 탐색하여 games, streams 테이블을 채웁니다.

```bash
curl "http://localhost:3000/api/cron/discover-top-games"
```

**실행 시간:** 약 2-5분 (게임 수에 따라 다름)  
**결과:** 
- `games` 테이블에 인기 게임 추가 (Steam AppID, 가격, 이미지 포함)
- `streams` 테이블에 라이브 스트리밍 추가 (시청자 수, 썸네일 포함)

**출력 예시:**
```json
{
  "success": true,
  "message": "Fetched 50 game streams (50 new, 0 updated)",
  "stats": {
    "totalFetched": 250,
    "gameStreams": 50,
    "created": 50,
    "updated": 0,
    "failed": 0
  }
}
```

### 2단계: update-streams (선택, 추가 스트리밍 정보)

이미 DB에 등록된 게임들의 최신 스트리밍 정보를 갱신합니다.

```bash
curl "http://localhost:3000/api/cron/update-streams"
```

### 3단계: update-steam (선택, Steam 가격/태그 갱신)

Steam 게임의 최신 가격과 태그를 갱신합니다 (1단계에서 이미 수집되지만, 최신화할 때 사용).

```bash
curl "http://localhost:3000/api/cron/update-steam"
```

---

## 확인 방법

### 브라우저에서 확인

1. `http://localhost:3000` 새로고침
2. **Now Trending** 섹션에 게임 카드가 표시되는지 확인
3. **Explore** 탭에서 게임/스트리밍 목록이 표시되는지 확인
4. 스트리밍 카드에 시청자 수가 표시되는지 확인

### Supabase에서 직접 확인

Supabase Dashboard → Table Editor에서:
- `games` 테이블에 데이터가 있는지 확인
- `streams` 테이블에 데이터가 있고, `is_live = true`인지 확인
- `viewer_count` 필드에 숫자가 있는지 확인

---

## 자동화 (Vercel 배포 시)

Vercel에 배포하면 `vercel.json`의 Cron 스케줄이 자동으로 실행됩니다:

| 엔드포인트 | 스케줄 | 설명 |
|-----------|--------|------|
| `/api/cron/discover-top-games` | `*/15 * * * *` | 15분마다 - 인기 게임/스트리밍 탐색 |
| `/api/cron/update-streams` | `*/10 * * * *` | 10분마다 - 기존 게임의 스트리밍 갱신 |
| `/api/cron/update-steam` | `0 0 * * *` | 매일 00:00 - Steam 가격/태그 갱신 |

**주의:** Vercel Cron은 `Authorization: Bearer CRON_SECRET` 헤더를 자동으로 전송하므로, Vercel 환경변수에 `CRON_SECRET`을 설정해야 합니다.

---

## 문제 해결

### "Unauthorized" (401) 오류 발생 시

- 로컬: `NODE_ENV=development`이므로 검증이 건너뛰어집니다. 401이 뜬다면 환경변수 확인
- 프로덕션: `CRON_SECRET`이 설정되어 있고, 헤더와 일치하는지 확인

### 데이터가 여전히 안 보이는 경우

1. 브라우저 콘솔에서 에러 확인 (F12 → Console)
2. Supabase에서 RLS 정책 확인 (읽기 권한이 `anon` 롤에 있는지)
3. `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 확인

### 시청자 수가 0으로 표시되는 경우

`discover-top-games`를 다시 실행하여 최신 데이터로 갱신하세요. Chzzk API에서 실시간 시청자 수를 가져옵니다.
