# Driflux V2 마이그레이션 플랜

> 작성일: 2026-03-27  
> 목적: `streams` 테이블 의존성 파악 및 V2 실시간 API 전환 로드맵

---

## 0단계 분석: `streams` 테이블 의존 현황

### streams 테이블 스키마 요약

```
streams
├── id                  BIGINT PK
├── game_id             BIGINT → games(id)
├── title               TEXT
├── streamer_name       TEXT
├── viewer_count        INT
├── thumbnail_url       TEXT
├── is_live             BOOLEAN
├── stream_category     TEXT       (치지직 liveCategoryValue)
├── chzzk_channel_id    TEXT
├── has_drops           BOOLEAN
├── last_chzzk_update   TIMESTAMPTZ
└── updated_at          TIMESTAMPTZ
```

---

### lib/data.ts 함수별 streams 의존성

| 함수 | 의존 방식 | V2 전환 방법 |
|------|-----------|--------------|
| `fetchLiveStreams()` | `streams WHERE is_live=true` | → `getPopularCategories()` Chzzk API 직접 호출 |
| `fetchSaleGames()` | `streams WHERE game_id IN (sale_games)` | → Steam DB 유지 + Chzzk 실시간 API |
| `fetchStreamsByGameId()` | `streams WHERE game_id=? OR stream_category ILIKE ?` | → `getChzzkStreamsByCategory()` |
| `fetchStreamsByGameTitle()` | `streams WHERE game_id IN (games)` | → `getChzzkStreamsByCategory()` |
| `fetchStreamsByTagId()` | `streams WHERE game_id IN (game_tags)` | → Chzzk 카테고리 API 배치 호출 |
| `fetchStreamsByTopTag()` | `streams WHERE game_id IN (top_tags games)` | → Chzzk 카테고리 API 배치 호출 |
| `fetchStreamsForFollowedTags()` | `streams WHERE game_id IN (followed tag games)` | → Context + Chzzk 직접 호출 |
| `fetchStreamsForFollowedGames()` | `streams WHERE game_id IN (followed games)` | → Context + Chzzk 직접 호출 |
| `searchStreams()` | `streams WHERE streamer_name ILIKE ? OR game_id IN` | → `searchChzzkLives()` |
| `getStreamsForGames()` | `streams WHERE game_id IN (?)` | → `getChzzkStreamsByCategory()` 배치 |
| `getStreamStatsForGameIds()` | `streams WHERE game_id IN (?) AND is_live=true` | → 일별 집계는 `daily_game_stats` |
| `getStreamStatsFromFetchStreamsByGameId()` | `fetchStreamsByGameId` 재귀 호출 | → `daily_game_stats` + 실시간 API |

---

### Supabase DB Views의 streams 의존성

아래 뷰들은 **현재 `streams` 테이블 기반**으로 동작합니다.  
V2 전환 시 뷰 SQL을 `daily_game_stats` 기반으로 재작성해야 합니다.

| View 이름 | 의존 방식 | 비고 |
|-----------|-----------|------|
| `trending_games` | `streams` 집계 (총 시청자, 스트림 수, trend_score) | → `daily_game_stats` 기반으로 재작성 필요 |
| `hidden_gems_games` | `streams` 중 스트림 5~29개, 시청자 ≥ 100 | → `daily_game_stats` + 게임 필터 |
| `new_releases_games` | `streams` + `games.release_date` 30일 이내 | → `daily_game_stats` + 날짜 필터 |
| `games_with_drops` | `streams WHERE has_drops=true` 집계 | → Chzzk API 실시간 호출로 전환 |

---

### 크론잡 현황 (vercel.json 기준)

| 경로 | 스케줄 | 역할 | V2 후 상태 |
|------|--------|------|------------|
| `/api/cron/discover-top-games` | `0 0 * * *` | Chzzk Top 50 → streams DB 저장 | **유지 (병행)** |
| `/api/cron/update-streams` | `0 0 * * *` | 특정 게임 스트림 업데이트 | **유지 (병행)** |
| `/api/cron/update-steam` | `0 0 * * *` | Steam 가격/메타 업데이트 | **유지** |
| `/api/cron/update-evaluations` | `0 1 * * *` | 평가 점수 업데이트 | **유지** |
| `/api/cron/update-daily-stats` | `0 * * * *` | 일일 피크 통계 집계 → `daily_game_stats` | **신규 추가** |

---

## 단계별 수정 대상 파일

### 3단계 (메인 탭 개편) 시 수정 필요

- `lib/data.ts`
  - `fetchTrendingGames()` → `daily_game_stats` 기반 쿼리로 교체
  - `fetchHiddenGemsGames()` → `daily_game_stats` 기반으로 재설계
  - `fetchNewReleasesGames()` → `daily_game_stats` + `games.release_date`
  - `fetchGamesWithDrops()` → Chzzk 실시간 API로 전환
- `app/page.tsx` — 실시간 트렌딩 탭 추가
- `components/driflux-home.tsx` / `home-client.tsx` — 트렌딩 탭 UI 분기
- **Supabase SQL Editor**: `trending_games`, `hidden_gems_games`, `new_releases_games` 뷰 재작성

### 4단계 (탐색/태그 페이지) 시 수정 필요

- `app/explore/page.tsx` — 투트랙 UI 분기 (라이브 vs 트렌드)
- `components/explore-*.tsx` — 라이브 탐색 컴포넌트 추가
- `app/tags/[tag]/page.tsx` — 스트림 목록 → 게임 카드 목록으로 전환
- `components/tag-details-page.tsx` — 게임 카드 렌더링으로 전환

### 5단계 (상세 페이지) 시 수정 필요

- `app/game/[id]/page.tsx` — `fetchStreamsByGameId()` → `getChzzkStreamsByCategory()` 전환
- `lib/data.ts` — `fetchStreamsByGameId()` 내부 로직 교체

---

## 주의사항

1. **크론잡 병행 기간**: `streams` 테이블 기반 크론잡은 3~5단계 완료 후에 중단합니다.
2. **DB 뷰 재작성 시점**: 실시간 API 연동이 완성된 후 뷰를 교체해야 서비스 공백이 없습니다.
3. **game_id 정수형**: `daily_game_stats.game_id`는 `games.id`(BIGINT)를 참조합니다.
4. **Vercel 크론 제한**: Free 플랜은 일별 크론만 지원, Pro 이상에서 hourly 사용 가능합니다.
