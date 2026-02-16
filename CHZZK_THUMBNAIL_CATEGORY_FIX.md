# 치지직 썸네일 & 카테고리 수정 완료 ✅

## 🐛 문제 상황

- ✅ 방송 상태(`is_live`), 제목(`title`) - 정상 작동
- ❌ 썸네일 이미지(`thumbnail_url`) - NULL 또는 `{type}` 치환 안됨
- ❌ 게임 카테고리(`stream_category`) - 저장되지 않음

---

## ✅ 수정 완료

### 1. DB 스키마 추가

**파일:** `sql/04_add_stream_category.sql`

```sql
-- stream_category 컬럼 추가
ALTER TABLE streams 
ADD COLUMN IF NOT EXISTS stream_category TEXT;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_streams_stream_category 
ON streams(stream_category) 
WHERE stream_category IS NOT NULL;
```

**Supabase SQL Editor에서 실행하세요!**

### 2. 썸네일 URL 처리 강화

**Before:**
```typescript
if (content.liveImageUrl) {
  thumbnailUrl = content.liveImageUrl.includes("{type}") 
    ? content.liveImageUrl.replace("{type}", "720")
    : content.liveImageUrl
}
```

**After:**
```typescript
if (content.liveImageUrl) {
  // CRITICAL: Always replace {type} with 720 using regex
  if (content.liveImageUrl.includes("{type}")) {
    thumbnailUrl = content.liveImageUrl.replace(/{type}/g, "720")
    console.log(`[Chzzk API] ✓ Thumbnail URL processed: {type} → 720`)
  } else {
    thumbnailUrl = content.liveImageUrl
  }
  console.log(`[Chzzk API] Final Thumbnail URL: ${thumbnailUrl}`)
} else {
  console.warn(`[Chzzk API] ⚠ liveImageUrl is null, using default thumbnail`)
  thumbnailUrl = DEFAULT_THUMBNAIL_URL // Fallback
}
```

**개선 사항:**
- ✅ 정규식 사용 (`/{type}/g`) - 모든 {type} 치환
- ✅ Default 썸네일 URL 추가 (API가 null 반환 시)
- ✅ 상세한 로그 출력

### 3. 카테고리 정보 수집 및 저장

**lib/chzzk.ts - 카테고리 추출:**
```typescript
// liveCategoryValue가 더 정확함 (우선 사용)
const categoryName = content.liveCategoryValue || content.liveCategory || null

console.log(`[Chzzk API] Category Info:`, {
  liveCategoryValue: content.liveCategoryValue || 'null',
  liveCategory: content.liveCategory || 'null',
  selected: categoryName || 'null'
})

const processedData: ProcessedChzzkData = {
  // ...
  category: categoryName || undefined,
}
```

**route.ts - DB 저장:**
```typescript
const { data: updateData, error: updateError } = await adminSupabase
  .from("streams")
  .update({
    title: liveData.title,
    thumbnail_url: liveData.thumbnail_url,
    is_live: liveData.is_live,
    viewer_count: liveData.viewer_count,
    stream_category: liveData.category || null, // ← 추가!
    last_chzzk_update: new Date().toISOString(),
  })
  .eq("id", stream.id)
  .select()
```

---

## 🧪 테스트 방법

### 1단계: DB 마이그레이션 실행

**Supabase SQL Editor에서:**
```sql
-- sql/04_add_stream_category.sql 파일 내용 복사 후 실행
```

### 2단계: 개발 서버 재시작

```bash
# Ctrl+C로 종료
npm run dev
```

### 3단계: API 호출

```bash
# 브라우저에서:
http://localhost:3000/api/cron/update-streams?channelId=실제_채널_ID
```

### 4단계: 터미널 로그 확인

**성공 시 예상 로그:**

```
[Chzzk API] ========================================
[Chzzk API] Response Status: 200 OK
[Chzzk API] Content status: OPEN
[Chzzk API] Live title: 한동숙 LOL 방송
[Chzzk API] ✓ Thumbnail URL processed: {type} → 720
[Chzzk API] Final Thumbnail URL: https://nng-phinf.pstatic.net/.../image_720.jpg
[Chzzk API] Category Info: {
  liveCategoryValue: 'League of Legends',
  liveCategory: '게임',
  selected: 'League of Legends'
}
[Chzzk API] ✓ Channel is LIVE!
[Chzzk API]   Title: 한동숙 LOL 방송
[Chzzk API]   Viewers: 15,234
[Chzzk API]   Category: League of Legends  ← 확인!
[Chzzk API]   Thumbnail: https://.../image_720.jpg  ← 확인!

[Chzzk Update] Updating stream 1 with data: {
  title: '한동숙 LOL 방송',
  is_live: true,
  viewer_count: 15234,
  category: 'League of Legends',  ← 확인!
  thumbnail: 'https://nng-phinf.pstatic.net/...'  ← 확인!
}
[Chzzk Update] ✓ Updated: 한동숙 방송 (LIVE)
```

### 5단계: DB 확인

**Supabase에서:**
```sql
SELECT 
  id, 
  title, 
  streamer_name,
  is_live,
  viewer_count,
  stream_category,  -- ← 새 컬럼
  thumbnail_url,    -- ← image_720.jpg 확인
  last_chzzk_update
FROM streams
WHERE chzzk_channel_id IS NOT NULL
ORDER BY viewer_count DESC;
```

**확인 사항:**
- ✅ `thumbnail_url`: `https://.../image_720.jpg` 형태
- ✅ `stream_category`: `"League of Legends"` 등 게임 이름
- ✅ `last_chzzk_update`: 방금 업데이트된 시간

---

## 📊 예상 결과

### Before (문제)

```sql
SELECT id, thumbnail_url, stream_category FROM streams WHERE id = 1;

-- Result:
id | thumbnail_url                           | stream_category
---|-----------------------------------------|----------------
1  | https://.../image_{type}.jpg  ← 문제!  | NULL  ← 문제!
```

### After (수정)

```sql
SELECT id, thumbnail_url, stream_category FROM streams WHERE id = 1;

-- Result:
id | thumbnail_url                           | stream_category
---|-----------------------------------------|-------------------
1  | https://.../image_720.jpg  ← 성공!     | League of Legends  ← 성공!
```

---

## 🎯 카테고리 활용 예시

### 게임별 스트림 필터링

```sql
-- LOL 방송만 보기
SELECT * FROM streams 
WHERE stream_category = 'League of Legends' 
AND is_live = true
ORDER BY viewer_count DESC;

-- 발로란트 방송만 보기
SELECT * FROM streams 
WHERE stream_category = 'Valorant' 
AND is_live = true
ORDER BY viewer_count DESC;
```

### 인기 게임 통계

```sql
-- 현재 가장 많이 방송되는 게임
SELECT 
  stream_category,
  COUNT(*) as stream_count,
  SUM(viewer_count) as total_viewers
FROM streams 
WHERE is_live = true AND stream_category IS NOT NULL
GROUP BY stream_category
ORDER BY total_viewers DESC
LIMIT 10;
```

**결과 예시:**
```
stream_category     | stream_count | total_viewers
--------------------|--------------|---------------
League of Legends   | 150          | 523,450
Valorant            | 85           | 312,800
Just Chatting       | 120          | 245,600
```

---

## 🔍 트러블슈팅

### ❌ thumbnail_url이 여전히 NULL

**확인 사항:**
1. 터미널에서 `Final Thumbnail URL:` 로그 확인
2. API 응답에 `liveImageUrl`이 있는지 확인
3. Default 썸네일이 사용되었는지 확인

**해결:**
- Default 썸네일 URL이 표시되면 API가 썸네일을 제공하지 않은 것
- 방송 중인 다른 채널로 테스트

### ❌ stream_category가 여전히 NULL

**확인 사항:**
1. `sql/04_add_stream_category.sql` 실행했는지 확인
2. 터미널에서 `Category Info:` 로그 확인
3. `liveCategoryValue` 값이 있는지 확인

**해결:**
```sql
-- 컬럼이 존재하는지 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'streams' AND column_name = 'stream_category';

-- 결과가 없다면 SQL 실행 필요
```

### ❌ thumbnail_url에 {type}이 여전히 있음

**원인:**
- 정규식이 적용되지 않음
- 캐시 문제

**해결:**
1. 서버 완전 재시작
2. 터미널에서 `Thumbnail URL processed: {type} → 720` 로그 확인
3. 브라우저 캐시 비우기 (Ctrl+F5)

---

## 📋 변경된 파일

1. **sql/04_add_stream_category.sql** (신규)
   - stream_category 컬럼 추가
   - 인덱스 추가

2. **lib/chzzk.ts**
   - DEFAULT_THUMBNAIL_URL 추가
   - 썸네일 처리 로직 강화 (정규식 사용)
   - 카테고리 추출 로직 개선
   - 상세한 디버깅 로그 추가

3. **app/api/cron/update-streams/route.ts**
   - stream_category 필드 추가
   - 업데이트 로그에 썸네일, 카테고리 정보 추가

---

## ✅ 체크리스트

- [ ] SQL 마이그레이션 실행 (`sql/04_add_stream_category.sql`)
- [ ] 개발 서버 재시작
- [ ] API 호출 테스트
- [ ] 터미널에서 `Final Thumbnail URL` 확인
- [ ] 터미널에서 `Category: League of Legends` 확인
- [ ] DB에서 `thumbnail_url` = `image_720.jpg` 확인
- [ ] DB에서 `stream_category` = 게임 이름 확인

---

## 🎨 Default 썸네일

API가 썸네일을 제공하지 않을 때 사용되는 기본 이미지:

```
https://via.placeholder.com/1280x720/1a1a1a/ffffff?text=No+Thumbnail
```

나중에 커스텀 이미지로 교체 가능합니다.

---

**작성일**: 2026-02-15  
**버전**: 2.1.0  
**Status**: ✅ 썸네일 & 카테고리 수정 완료
