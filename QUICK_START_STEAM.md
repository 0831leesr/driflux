# 🚀 Steam 연동 빠른 시작 가이드

3단계로 스팀 데이터 연동을 완료하세요!

---

## ⚡ 빠른 설정 (5분)

### **1단계: 데이터베이스 설정** (1분)

Supabase SQL Editor에서 실행:

```sql
-- steam_appid 타입 변경
ALTER TABLE games 
ALTER COLUMN steam_appid TYPE INTEGER USING steam_appid::integer;

-- 가격 필드 추가
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS price_krw INTEGER,
ADD COLUMN IF NOT EXISTS original_price_krw INTEGER,
ADD COLUMN IF NOT EXISTS discount_rate INTEGER,
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_steam_update TIMESTAMP;
```

### **2단계: 테스트 게임 추가** (1분)

```sql
INSERT INTO games (title, steam_appid) VALUES
  ('ELDEN RING', 1245620),
  ('Cyberpunk 2077', 1091500),
  ('Hollow Knight', 367520)
ON CONFLICT (steam_appid) DO NOTHING;
```

### **3단계: API 테스트** (3분)

1. 개발 서버 실행:
   ```bash
   npm run dev
   ```

2. 브라우저에서 접속:
   ```
   http://localhost:3000/api/cron/update-steam?limit=1
   ```

3. ✅ 성공! JSON 응답이 보이면 완료입니다.

---

## 🎮 **인기 게임 Steam App ID**

| 게임 | App ID | 사용법 |
|-----|--------|-------|
| **엘든 링** | `1245620` | `?appid=1245620` |
| **사이버펑크 2077** | `1091500` | `?appid=1091500` |
| **발더스 게이트 3** | `1086940` | `?appid=1086940` |
| **할로우 나이트** | `367520` | `?appid=367520` |
| **세키로** | `814380` | `?appid=814380` |

---

## 🧪 **테스트 명령어**

```bash
# 1개 게임만 업데이트 (테스트)
http://localhost:3000/api/cron/update-steam?limit=1

# 엘든링만 업데이트
http://localhost:3000/api/cron/update-steam?appid=1245620

# 전체 업데이트
http://localhost:3000/api/cron/update-steam
```

---

## 📊 **응답 예시**

```json
{
  "success": true,
  "message": "Updated 1 of 1 games",
  "stats": {
    "total": 1,
    "updated": 1,
    "failed": 0
  },
  "details": [
    {
      "id": 1,
      "title": "ELDEN RING",
      "steam_appid": 1245620,
      "status": "updated"
    }
  ],
  "duration": 1523
}
```

---

## 🔧 **자동 업데이트 설정**

매일 자동으로 업데이트하려면 Vercel에 배포 후:

```json
// vercel.json (이미 생성됨)
{
  "crons": [{
    "path": "/api/cron/update-steam",
    "schedule": "0 2 * * *"
  }]
}
```

매일 오전 2시(UTC)에 자동 실행됩니다!

---

## ❓ **문제 해결**

### **"No games with steam_appid found"**
→ 2단계에서 테스트 게임을 추가하세요.

### **"Steam API returned no data"**
→ App ID가 올바른지 확인하세요. 위 표 참조.

### **업데이트가 느림**
→ 정상입니다! Rate Limit 때문에 게임당 1.5초 걸립니다.

---

## 🎉 **다음 단계**

- ✅ 더 많은 게임 추가 (`sql/02_insert_test_games.sql`)
- ✅ 정기 업데이트 설정 (Vercel Cron)
- ✅ 프론트엔드에서 가격 표시

상세 가이드: `STEAM_INTEGRATION.md` 참조

---

**완료! 🎮✨**
