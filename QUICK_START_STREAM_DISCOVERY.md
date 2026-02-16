# Quick Start: Stream Discovery System

## 🎯 개요
게임별로 치지직(Chzzk) 실시간 방송을 자동으로 탐색하고 DB에 저장하는 시스템

## 🚀 빠른 시작 (5분)

### 1단계: DB 준비 ✅ (이미 완료)
```sql
-- sql/06_add_korean_title.sql이 이미 실행되었다면 스킵
```

### 2단계: 게임 데이터 확인
```sql
-- 한글 제목이 있는 게임 확인
SELECT id, title, korean_title 
FROM games 
WHERE korean_title IS NOT NULL
LIMIT 10;
```

한글 제목이 없으면 추가:
```sql
UPDATE games 
SET korean_title = '리그 오브 레전드' 
WHERE title ILIKE '%league of legends%';
```

### 3단계: 스트림 탐색 실행

#### 로컬 테스트
```bash
# 테스트용: 1개 게임만 처리
curl "http://localhost:3000/api/cron/update-streams?limit=1"

# 5개 게임 처리
curl "http://localhost:3000/api/cron/update-streams?limit=5"

# 특정 게임만 처리
curl "http://localhost:3000/api/cron/update-streams?gameId=42"

# 전체 실행
curl "http://localhost:3000/api/cron/update-streams"
```

#### 브라우저에서
```
http://localhost:3000/api/cron/update-streams?limit=1
```

### 4단계: 결과 확인
```sql
-- 발견된 라이브 스트림 확인
SELECT 
  s.id,
  s.streamer_name,
  s.title,
  s.viewer_count,
  g.title as game_title,
  g.korean_title
FROM streams s
JOIN games g ON s.game_id = g.id
WHERE s.is_live = true
ORDER BY s.viewer_count DESC
LIMIT 10;
```

## 📊 예상 결과

### 콘솔 출력
```
[Stream Discovery] Starting game-based stream discovery job...
[Stream Discovery] Found 10 games to search

[Stream Discovery] Processing game 42: League of Legends
[Chzzk Search] Searching for: "리그 오브 레전드"
[Chzzk Search] ✓ Found 15 live streams
[Stream Discovery] ✓ Created: 페이커 - 솔랭
[Stream Discovery] ✓ Updated: 젠지 - 스크림

...

[Stream Discovery] Job completed in 45230ms
[Stream Discovery] Games processed: 10
[Stream Discovery] Total streams found: 45
[Stream Discovery] Streams created: 12
[Stream Discovery] Streams updated: 33
```

### API 응답 (JSON)
```json
{
  "success": true,
  "message": "Processed 10 games, found 45 streams (12 new, 33 updated)",
  "stats": {
    "gamesProcessed": 10,
    "gamesWithStreams": 8,
    "streamsFound": 45,
    "streamsCreated": 12,
    "streamsUpdated": 33,
    "streamsFailed": 0
  },
  "duration": 45230
}
```

## 🔍 동작 원리

```
1. games 테이블에서 게임 목록 가져오기
   ↓
2. 각 게임의 korean_title로 치지직 검색
   예: "리그 오브 레전드" → 15개 방송 발견
   ↓
3. 발견된 방송을 streams 테이블에 Upsert
   - 새 방송 → INSERT
   - 기존 방송 → UPDATE (시청자 수, 제목 등)
   ↓
4. 검색에서 제외된 방송 → is_live = false
   ↓
5. 완료!
```

## 📈 핵심 기능

### ✅ 자동 발견
- **새 방송 자동 등록**: 수동 등록 불필요
- **실시간 업데이트**: 시청자 수, 제목 등

### ✅ 게임 매핑
- **자동 연결**: 검색된 방송 → 게임 자동 매핑
- **한글 우선**: korean_title 우선 사용

### ✅ 중복 방지
- **Upsert 로직**: 채널 ID 기준 중복 방지
- **기존 데이터 보존**: 불필요한 재생성 없음

### ✅ 오프라인 처리
- **자동 감지**: 검색에서 제외된 방송 자동 오프라인 처리
- **데이터 정제**: 유효한 데이터만 유지

## ⚙️ 설정

### Vercel Cron (자동 실행)
```json
{
  "crons": [
    {
      "path": "/api/cron/update-streams",
      "schedule": "*/5 * * * *"  // 5분마다 자동 실행
    }
  ]
}
```

### 수동 실행 주기 권장
- **개발 환경**: 필요할 때마다 수동 실행
- **프로덕션**: 5-10분마다 자동 실행

## 🛠️ 문제 해결

### 방송이 검색되지 않음
```sql
-- 1. 한글 제목 확인
SELECT id, title, korean_title FROM games WHERE id = 게임ID;

-- 2. 한글 제목 추가/수정
UPDATE games 
SET korean_title = '정확한 검색어'
WHERE id = 게임ID;

-- 3. 다시 실행
```

### 특정 게임만 테스트
```bash
# 게임 ID 42만 처리
curl "http://localhost:3000/api/cron/update-streams?gameId=42"
```

### 속도가 느림
```bash
# 게임 수 제한
curl "http://localhost:3000/api/cron/update-streams?limit=3"
```

## 📊 모니터링 쿼리

### 실시간 통계
```sql
-- 라이브 방송 수
SELECT 
  COUNT(*) as total_live_streams,
  SUM(viewer_count) as total_viewers
FROM streams 
WHERE is_live = true;

-- 게임별 방송 수
SELECT 
  g.korean_title,
  COUNT(s.id) as stream_count,
  SUM(s.viewer_count) as viewers
FROM games g
LEFT JOIN streams s ON g.id = s.game_id AND s.is_live = true
GROUP BY g.id, g.korean_title
HAVING COUNT(s.id) > 0
ORDER BY viewers DESC;

-- 최근 업데이트 시간
SELECT 
  MAX(last_chzzk_update) as last_update,
  COUNT(*) FILTER (WHERE is_live = true) as live_count
FROM streams;
```

### 인기 스트리머
```sql
SELECT 
  streamer_name,
  title,
  viewer_count,
  g.korean_title as game
FROM streams s
JOIN games g ON s.game_id = g.id
WHERE s.is_live = true
ORDER BY s.viewer_count DESC
LIMIT 10;
```

## 🎮 인기 게임 추가하기

```sql
-- 리그 오브 레전드
UPDATE games SET korean_title = '리그 오브 레전드' 
WHERE title ILIKE '%league of legends%';

-- 발로란트
UPDATE games SET korean_title = '발로란트' 
WHERE title ILIKE '%valorant%';

-- 마인크래프트
UPDATE games SET korean_title = '마인크래프트' 
WHERE title ILIKE '%minecraft%';

-- 오버워치
UPDATE games SET korean_title = '오버워치' 
WHERE title ILIKE '%overwatch%';

-- 로스트아크
UPDATE games SET korean_title = '로스트아크' 
WHERE title ILIKE '%lost ark%';

-- 스타크래프트
UPDATE games SET korean_title = '스타크래프트' 
WHERE title ILIKE '%starcraft%';
```

## 📝 체크리스트

- [ ] DB에 게임 데이터 있음 (games 테이블)
- [ ] 한글 제목 설정됨 (korean_title 컬럼)
- [ ] API 실행 테스트 (`limit=1`로 시작)
- [ ] 결과 확인 (streams 테이블 조회)
- [ ] Cron 설정 (자동 실행)

## 🚨 주의사항

### Rate Limiting
- **게임 간 딜레이**: 1.5초 자동 적용
- **권장**: 한 번에 많은 게임 처리하지 말 것
- **안전**: `limit` 파라미터 활용

### API 안정성
- **봇 차단 방지**: User-Agent 헤더 자동 설정
- **에러 처리**: 실패 시 빈 배열 반환 (안전)
- **로그**: 모든 과정 상세 로깅

## 🔗 관련 문서

- **상세 가이드**: `STREAM_DISCOVERY.md`
- **게임 매핑**: `CHZZK_GAME_MAPPING.md`
- **치지직 API**: `CHZZK_INTEGRATION.md`

## 💡 다음 단계

1. **프론트엔드 구현**: 게임별 라이브 방송 목록 페이지
2. **실시간 대시보드**: 인기 게임/스트리머 통계
3. **알림 시스템**: 새 방송 알림
4. **검색 최적화**: 더 정확한 게임 매칭

## 🎉 완료!

이제 치지직의 실시간 방송이 자동으로 수집됩니다!

```bash
# 한번 실행해보세요
curl "http://localhost:3000/api/cron/update-streams?limit=3"
```
