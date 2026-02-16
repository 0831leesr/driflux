# Cron Jobs 설정 가이드

## 환경변수: CRON_SECRET

Cron API 엔드포인트(`/api/cron/update-streams`, `/api/cron/update-steam`)는 무단 호출 방지를 위해 `Authorization` 헤더 검증을 사용합니다.

### CRON_SECRET 생성 방법

터미널에서 다음 명령어로 랜덤 시크릿을 생성할 수 있습니다:

**PowerShell (Windows):**
```powershell
$bytes = [byte[]]::new(32)
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

**Git Bash / Linux / macOS:**
```bash
openssl rand -base64 32
```

**Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

생성된 문자열을 `.env.local`에 추가하세요:

```env
CRON_SECRET=your_generated_secret_here
```

### Vercel 배포 시

Vercel 대시보드 → 프로젝트 → Settings → Environment Variables에서 `CRON_SECRET`을 추가하세요.  
Vercel Cron이 자동으로 이 값을 `Authorization: Bearer <CRON_SECRET>` 헤더로 전달합니다.

---

## 로컬 테스트 방법

`.env.local`에 `CRON_SECRET`을 설정한 후, 개발 서버를 실행하고 아래 명령어로 테스트하세요.

> **참고:** `NODE_ENV=development`에서는 보안 검증을 건너뛰므로, 헤더 없이도 호출 가능합니다.  
> 프로덕션과 동일한 동작(401 검증)을 테스트하려면 `npm run build && npm start`로 프로덕션 모드를 실행한 뒤 curl을 실행하세요.

### curl 예시 (Authorization 헤더 포함)

```bash
# update-streams (치지직 라이브 정보 - 10분마다)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "http://localhost:3000/api/cron/update-streams"

# update-steam (스팀 가격/태그 정보 - 매일 자정)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "http://localhost:3000/api/cron/update-steam"
```

`YOUR_CRON_SECRET`을 `.env.local`에 설정한 실제 `CRON_SECRET` 값으로 교체하세요.

### 잘못된 시크릿으로 호출 시 (401 응답)

```bash
curl -H "Authorization: Bearer wrong_secret" "http://localhost:3000/api/cron/update-streams"
# {"error":"Unauthorized"} - 401
```

---

## Cron 스케줄 (vercel.json)

| 엔드포인트 | 스케줄 | 설명 |
|-----------|--------|------|
| `/api/cron/discover-top-games` | `*/15 * * * *` | 15분마다 - 인기 게임/스트리밍 자동 탐색 |
| `/api/cron/update-streams` | `*/10 * * * *` | 10분마다 - 치지직 라이브 정보 갱신 |
| `/api/cron/update-steam` | `0 0 * * *` | 매일 00:00 (자정) - 스팀 가격/태그 정보 갱신 |

---

## 초기 데이터 설정

**중요:** Cron Jobs는 데이터를 **수집**하는 역할만 합니다. 프론트엔드가 표시할 데이터가 없다면, 먼저 Cron 엔드포인트를 수동으로 호출하여 DB를 채워야 합니다.

자세한 내용은 **[INITIAL_DATA_SETUP.md](./INITIAL_DATA_SETUP.md)**를 참고하세요.
