# 🎮 Steam Integration Guide

이 가이드는 Driflux 프로젝트에 Steam API를 연동하여 실시간 게임 데이터를 가져오는 방법을 설명합니다.

---

## 📋 **설정 단계**

### **1단계: 데이터베이스 스키마 업데이트**

Supabase SQL Editor에서 다음 SQL을 실행하세요:

```sql
-- sql/01_add_steam_fields.sql 파일의 내용을 실행
```

또는 간단한 버전:

```sql
-- steam_appid 타입 변경 (string → integer)
ALTER TABLE games 
ALTER COLUMN steam_appid TYPE INTEGER USING steam_appid::integer;

-- UNIQUE 제약 조건
ALTER TABLE games 
ADD CONSTRAINT unique_steam_appid UNIQUE (steam_appid);

-- 가격 필드 추가
ALTER TABLE games 
ADD COLUMN price_krw INTEGER,
ADD COLUMN original_price_krw INTEGER,
ADD COLUMN currency VARCHAR(10) DEFAULT 'KRW',
ADD COLUMN is_free BOOLEAN DEFAULT FALSE,
ADD COLUMN last_data_update TIMESTAMP WITH TIME ZONE,
ADD COLUMN header_image_url TEXT,
ADD COLUMN background_image_url TEXT;

-- 인덱스 생성
CREATE INDEX idx_games_steam_appid ON games(steam_appid);
CREATE INDEX idx_games_discount_rate ON games(discount_rate DESC);
```

---

### **2단계: 테스트 데이터 삽입**

인기 게임들의 Steam App ID를 데이터베이스에 추가하세요:

```sql
-- 기존 게임 업데이트
UPDATE games SET steam_appid = 1245620 WHERE title ILIKE '%elden ring%';
UPDATE games SET steam_appid = 1091500 WHERE title ILIKE '%cyberpunk%';
UPDATE games SET steam_appid = 1086940 WHERE title ILIKE '%baldur%';
UPDATE games SET steam_appid = 367520 WHERE title ILIKE '%hollow knight%';
UPDATE games SET steam_appid = 814380 WHERE title ILIKE '%sekiro%';

-- 또는 새 게임 삽입
INSERT INTO games (title, steam_appid) VALUES
  ('Elden Ring', 1245620),
  ('Cyberpunk 2077', 1091500),
  ('Baldur''s Gate 3', 1086940),
  ('Hollow Knight', 367520),
  ('Sekiro: Shadows Die Twice', 814380),
  ('Dark Souls III', 374320),
  ('The Witcher 3: Wild Hunt', 292030),
  ('Stardew Valley', 413150),
  ('Terraria', 105600),
  ('Hades', 1145360);
```

---

## 🚀 **사용 방법**

### **API 엔드포인트**

#### **1. 전체 게임 업데이트**
```bash
GET http://localhost:3000/api/cron/update-steam
```

모든 `steam_appid`가 있는 게임을 업데이트합니다.

#### **2. 제한된 개수만 업데이트**
```bash
GET http://localhost:3000/api/cron/update-steam?limit=5
```

처음 5개의 게임만 업데이트합니다 (테스트용).

#### **3. 특정 게임만 업데이트**
```bash
GET http://localhost:3000/api/cron/update-steam?appid=1245620
```

엘든링(App ID: 1245620)만 업데이트합니다.

---

### **브라우저에서 테스트**

1. 개발 서버 실행:
   ```bash
   npm run dev
   ```

2. 브라우저에서 접속:
   ```
   http://localhost:3000/api/cron/update-steam?limit=3
   ```

3. 응답 예시:
   ```json
   {
     "success": true,
     "message": "Updated 3 of 3 games",
     "stats": {
       "total": 3,
       "updated": 3,
       "failed": 0,
       "skipped": 0
     },
     "details": [
       {
         "id": 1,
         "title": "ELDEN RING",
         "steam_appid": 1245620,
         "status": "updated"
       },
       {
         "id": 2,
         "title": "Cyberpunk 2077",
         "steam_appid": 1091500,
         "status": "updated"
       },
       {
         "id": 3,
         "title": "Baldur's Gate 3",
         "steam_appid": 1086940,
         "status": "updated"
       }
     ],
     "duration": 4523
   }
   ```

---

## 🎯 **인기 게임 Steam App ID**

테스트나 데이터베이스 초기화에 사용할 수 있는 인기 게임 목록:

| 게임 이름 | Steam App ID | 장르 |
|----------|--------------|------|
| **Elden Ring** | `1245620` | 액션 RPG |
| **Cyberpunk 2077** | `1091500` | RPG |
| **Baldur's Gate 3** | `1086940` | RPG |
| **Hollow Knight** | `367520` | 메트로배니아 |
| **Sekiro: Shadows Die Twice** | `814380` | 액션 |
| **Dark Souls III** | `374320` | 액션 RPG |
| **The Witcher 3** | `292030` | RPG |
| **Stardew Valley** | `413150` | 시뮬레이션 |
| **Terraria** | `105600` | 샌드박스 |
| **Hades** | `1145360` | 로그라이크 |
| **Celeste** | `504230` | 플랫포머 |
| **Portal 2** | `620` | 퍼즐 |
| **Half-Life 2** | `220` | FPS |
| **Grand Theft Auto V** | `271590` | 액션 |
| **Red Dead Redemption 2** | `1174180` | 액션 |

---

## 🔧 **고급 설정**

### **Vercel Cron Job 설정**

`vercel.json` 파일에 추가:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-steam",
      "schedule": "0 0 * * *"
    }
  ]
}
```

이렇게 하면 매일 자정(UTC)에 자동으로 실행됩니다.

---

### **환경 변수 (선택사항)**

`.env.local`에 추가:

```env
# Steam API 설정
STEAM_API_KEY=your_steam_api_key_here  # 선택사항 (공개 API는 필요 없음)
STEAM_COUNTRY_CODE=KR                   # 기본값: KR
STEAM_LANGUAGE=korean                   # 기본값: korean
```

---

## 📊 **데이터 구조**

업데이트되는 필드들:

```typescript
{
  title: "ELDEN RING",                    // 스팀에서 가져온 정확한 제목
  steam_appid: 1245620,                   // 스팀 App ID
  cover_image_url: "https://...",         // 헤더 이미지
  header_image_url: "https://...",        // 스팀 헤더 이미지
  background_image_url: "https://...",    // 배경 이미지
  price_krw: 60000,                       // 현재 가격 (원)
  original_price_krw: 60000,              // 원래 가격 (원)
  discount_rate: 20,                      // 할인율 (%)
  is_free: false,                         // 무료 게임 여부
  currency: "KRW",                        // 통화
  last_data_update: "2024-01-15T10:30:00Z"  // 마지막 메타데이터 갱신 시간
}
```

---

## 🐛 **문제 해결**

### **에러: "Invalid appid parameter"**
- Steam App ID가 숫자인지 확인하세요.

### **에러: "Steam API returned no data"**
- App ID가 올바른지 확인하세요.
- 해당 게임이 Steam 스토어에 있는지 확인하세요.
- 지역 제한 게임인지 확인하세요.

### **Rate Limit 에러**
- API는 자동으로 1.5초 간격으로 요청합니다.
- 대량 업데이트 시 시간이 오래 걸릴 수 있습니다.

### **Database 에러**
- Supabase에서 스키마가 올바르게 생성되었는지 확인하세요.
- `steam_appid` 컬럼이 INTEGER 타입인지 확인하세요.

---

## 📝 **개발 팁**

### **로컬 테스트**

```typescript
// lib/steam.ts를 직접 테스트
import { getSteamGameDetails, processSteamData } from '@/lib/steam'

const data = await getSteamGameDetails(1245620) // Elden Ring
console.log(data)
```

### **수동 업데이트 스크립트**

```typescript
// scripts/update-steam.ts
import { getSteamGamesBatch, POPULAR_STEAM_GAMES } from '@/lib/steam'

const appIds = Object.values(POPULAR_STEAM_GAMES)
const results = await getSteamGamesBatch(appIds)
console.log(results)
```

---

## 🎉 **완료!**

이제 Steam 데이터 연동이 완료되었습니다!

다음 단계:
1. ✅ SQL 스키마 업데이트
2. ✅ 테스트 데이터 삽입
3. ✅ API 테스트 (`/api/cron/update-steam?limit=1`)
4. ✅ 전체 데이터 업데이트
5. ⏰ Cron Job 설정 (선택사항)

문제가 있거나 질문이 있으면 개발팀에 문의하세요! 🚀
