# 프론트엔드 DB 스키마 통합 리팩토링 완료 ✅

## 📋 개요

프론트엔드를 실제 Supabase DB 스키마에 맞춰 완전히 리팩토링했습니다. 이제 실제 데이터가 UI에 정확하게 표시됩니다.

---

## 🔧 작업 내용

### 1단계: 타입 정의 및 데이터 페칭 수정 ✅

#### lib/types.ts - 인터페이스 업데이트

**Before:**
```typescript
export interface GameRow {
  id: string
  title: string
  steam_appid: string | null
  cover_image_url: string | null
  discount_rate: number | null
}

export interface StreamRow {
  id: string
  game_id: string
  title: string
  streamer_name: string
  viewer_count: number
  is_live: boolean
  games?: GameRow
}
```

**After:**
```typescript
export interface GameRow {
  id: number
  title: string
  steam_appid: number | null
  cover_image_url: string | null
  header_image_url: string | null
  background_image_url: string | null
  discount_rate: number | null
  price_krw: number | null          // ← 추가
  original_price_krw: number | null // ← 추가
  currency: string | null
  is_free: boolean | null
  last_steam_update: string | null
}

export interface StreamRow {
  id: number
  game_id: number | null
  title: string | null
  streamer_name: string | null
  viewer_count: number | null
  thumbnail_url: string | null
  is_live: boolean
  stream_category: string | null     // ← 추가 (치지직 카테고리)
  chzzk_channel_id: string | null
  last_chzzk_update: string | null
  games?: GameRow
}
```

#### lib/data.ts - 쿼리 및 데이터 변환 수정

**주요 변경사항:**

1. **모든 필드 포함:**
   - `stream_category` 포함하도록 쿼리 수정
   - `price_krw`, `original_price_krw` 등 가격 필드 포함

2. **카테고리 우선순위:**
   ```typescript
   // Priority: stream_category (치지직) > game title > "Unknown"
   gameTitle: s.stream_category || s.games?.title || "Unknown Game"
   ```

3. **시청자 수 raw + formatted:**
   ```typescript
   viewers: s.viewer_count ?? 0,              // Raw number
   viewersFormatted: formatViewers(s.viewer_count), // Formatted string
   ```

4. **할인 게임 데이터 확장:**
   - 스트림 데이터 + 게임 데이터 모두 반환
   - 게임 카드에서 바로 사용 가능

---

### 2단계: 유틸리티 함수 추가 ✅

#### lib/utils.ts - 포맷터 함수 추가

```typescript
/**
 * Format number to Korean Won (원화)
 * @example formatKRW(45000) → "45,000원"
 * @example formatKRW(0) → "무료"
 */
export function formatKRW(price: number | null | undefined): string

/**
 * Format viewer count (Korean style)
 * @example formatViewerCount(1234) → "1,234명"
 * @example formatViewerCount(15000) → "1.5만명"
 */
export function formatViewerCount(count: number | null | undefined): string

/**
 * Format viewer count (short version for badges)
 * @example formatViewerCountShort(1234) → "1.2K"
 */
export function formatViewerCountShort(count: number | null | undefined): string

/**
 * Format discount rate
 * @example formatDiscountRate(50) → "-50%"
 */
export function formatDiscountRate(rate: number | null | undefined): string
```

**추가된 유틸리티:**
- ✅ `formatKRW` - 원화 포맷
- ✅ `formatViewerCount` - 시청자 수 (한국식)
- ✅ `formatViewerCountShort` - 시청자 수 (짧은 버전)
- ✅ `calculateDiscountRate` - 할인율 계산
- ✅ `formatDiscountRate` - 할인율 포맷

---

### 3단계: 스트림 카드 컴포넌트 수정 ✅

#### components/stream-card.tsx

**Before:**
```typescript
export interface StreamData {
  thumbnail: string
  gameCover: string
  gameTitle: string
  streamTitle: string
  streamerName: string
  viewers: string // 문자열
}
```

**After:**
```typescript
export interface StreamData {
  id: number
  thumbnail: string
  gameCover: string
  gameTitle: string
  streamTitle: string
  streamerName: string
  viewers: number              // ← 숫자로 변경
  viewersFormatted?: string
  isLive?: boolean             // ← 추가
  saleDiscount?: string
  rawData?: {
    streamCategory: string | null
    gameData: any
  }
}
```

**주요 개선사항:**

1. **썸네일 우선순위:**
   ```typescript
   // 썸네일 우선, 없으면 게임 커버 사용
   const displayImage = stream.thumbnail || stream.gameCover || "/placeholder.svg"
   ```

2. **LIVE 배지:**
   ```tsx
   {isLive && (
     <div className="bg-[hsl(var(--live-red))] px-2 py-1">
       <span className="animate-pulse">●</span>
       <span>LIVE</span>
     </div>
   )}
   ```

3. **시청자 수 배지:**
   ```tsx
   {stream.viewers > 0 && (
     <div className="bg-black/70 px-2 py-1">
       <Eye className="h-3 w-3" />
       <span>{viewerDisplay}</span>
     </div>
   )}
   ```

4. **게임 타이틀:**
   - `stream_category` (치지직 카테고리) 우선
   - 없으면 `games.title` 사용
   - 둘 다 없으면 "Unknown Game"

---

### 4단계: 게임 카드 컴포넌트 추가 ✅

#### components/game-card.tsx (신규)

```typescript
export interface GameCardData {
  id: number
  title: string
  cover_image_url: string | null
  header_image_url?: string | null
  price_krw: number | null
  original_price_krw: number | null
  discount_rate: number | null
  is_free?: boolean | null
}
```

**주요 기능:**

1. **무료 게임 표시:**
   ```tsx
   {isFree ? (
     <Badge>무료 플레이</Badge>
   ) : ...}
   ```

2. **할인 표시 (3가지 정보):**
   ```tsx
   {hasDiscount && (
     <>
       {/* 할인율 배지 */}
       <Badge>-50%</Badge>
       
       {/* 원가 (취소선) */}
       <span className="line-through">₩45,000</span>
       
       {/* 할인가 (강조) */}
       <span className="text-amber-400">₩22,500</span>
     </>
   )}
   ```

3. **정가 표시:**
   ```tsx
   {!hasDiscount && price_krw !== null && (
     <span>₩45,000</span>
   )}
   ```

---

## 📊 데이터 흐름

### Before (더미 데이터)

```
DB → data.ts → 하드코딩된 변환 → 컴포넌트
          ↓
       "Unknown" 표시
```

### After (실제 데이터)

```
DB (실제 스키마) → data.ts (정확한 쿼리) → 유틸 함수 → 컴포넌트
                                             ↓
                           stream_category, price_krw 등 정확히 표시
```

---

## 🎯 결과

### 스트림 카드

**Before:**
```
게임: Unknown
시청자: "0"
썸네일: 더미 이미지
```

**After:**
```
게임: League of Legends (치지직 카테고리)
시청자: 1.5만명 (실제 데이터)
썸네일: https://.../image_720.jpg (실제 썸네일)
LIVE 배지: 빨간색 애니메이션
```

### 게임 카드

**Before:**
```
가격: 표시 안됨
할인: 표시 안됨
```

**After:**
```
무료 게임: "무료 플레이" 배지
할인 게임:
  - 할인율: -50% (배지)
  - 원가: ₩45,000 (취소선)
  - 할인가: ₩22,500 (강조)
정가: ₩45,000
```

---

## 🧪 테스트 방법

### 1. 개발 서버 재시작

```bash
npm run dev
```

### 2. 메인 페이지 확인

```bash
http://localhost:3000
```

**확인 사항:**
- ✅ 스트림 카드에 실제 게임 이름 표시
- ✅ 시청자 수 정확히 표시 (1.2K, 1.5만명 등)
- ✅ 썸네일 이미지 정상 로드
- ✅ LIVE 배지 표시
- ✅ 할인 게임 가격 정보 표시

### 3. 할인 게임 섹션 확인

**확인 사항:**
- ✅ 할인율 배지 표시
- ✅ 원가 취소선 표시
- ✅ 할인가 강조 표시
- ✅ 무료 게임 "무료 플레이" 배지

---

## 📋 변경된 파일

### 코어 파일

1. **lib/types.ts** - 인터페이스 업데이트
2. **lib/data.ts** - 쿼리 및 데이터 변환 수정
3. **lib/utils.ts** - 유틸리티 함수 추가
4. **components/stream-card.tsx** - 실제 데이터 구조에 맞춰 수정
5. **components/game-card.tsx** - 게임 카드 컴포넌트 추가 (신규)

### 타입 변경 영향

- `StreamData` 인터페이스 변경 → 모든 스트림 카드 사용처에 영향
- `GameRow` 인터페이스 확장 → 게임 관련 컴포넌트에 영향

---

## 🔍 주요 개선사항

### 1. 타입 안정성

- ✅ `id: string` → `id: number` (DB 실제 타입)
- ✅ `viewers: string` → `viewers: number` (계산 가능)
- ✅ 모든 nullable 필드 명시

### 2. 데이터 정확성

- ✅ `stream_category` (치지직) 우선 표시
- ✅ 실제 썸네일 URL 사용
- ✅ 실제 시청자 수 사용
- ✅ 실제 가격 정보 사용

### 3. UI/UX

- ✅ LIVE 배지 추가 (빨간색 애니메이션)
- ✅ 시청자 수 배지 추가 (눈 아이콘)
- ✅ 할인율, 원가, 할인가 모두 표시
- ✅ 무료 게임 명확한 표시

### 4. 성능

- ✅ 불필요한 데이터 변환 제거
- ✅ 이미지 최적화 (unoptimized for placeholder)
- ✅ 캐싱 활용

---

## 🎨 UI 예시

### 스트림 카드

```
┌─────────────────────────────┐
│ [썸네일 이미지]             │
│   ┌─────┐         ┌──────┐  │
│   │ 👁 │ 1.2K    │ LIVE │  │ ← 배지들
│   └─────┘         └──────┘  │
│   [게임 커버]               │
├─────────────────────────────┤
│ League of Legends  한동숙   │ ← 게임 & 스트리머
│ 한동숙 LOL 방송            │ ← 방송 제목
│ [-50%]                      │ ← 할인 배지 (있다면)
└─────────────────────────────┘
```

### 게임 카드 (할인)

```
┌─────────────────────────────┐
│ [게임 헤더 이미지]          │
│                    [-50%]   │ ← 할인율 배지
├─────────────────────────────┤
│ Elden Ring                  │
│ ₩45,000  ₩22,500           │
│   ↑취소선    ↑강조          │
└─────────────────────────────┘
```

### 게임 카드 (무료)

```
┌─────────────────────────────┐
│ [게임 헤더 이미지]          │
├─────────────────────────────┤
│ Valorant                    │
│ [무료 플레이]              │ ← 무료 배지
└─────────────────────────────┘
```

---

## ✅ 체크리스트

- [x] 타입 정의 업데이트 (types.ts)
- [x] 데이터 페칭 수정 (data.ts)
- [x] 유틸리티 함수 추가 (utils.ts)
- [x] 스트림 카드 수정 (stream-card.tsx)
- [x] 게임 카드 추가 (game-card.tsx)
- [x] 린터 에러 없음
- [x] 문서 작성

---

## 🚀 다음 단계

1. **실시간 업데이트:**
   - WebSocket으로 시청자 수 실시간 반영
   - 새 방송 시작 시 자동 갱신

2. **필터링 & 정렬:**
   - 게임별 필터
   - 시청자 수, 할인율 정렬
   - 카테고리 필터

3. **검색 기능:**
   - 게임 이름 검색
   - 스트리머 이름 검색
   - 카테고리 검색

4. **추가 데이터:**
   - 방송 시작 시간
   - 게임 플레이 시간
   - 평점/리뷰

---

**작성일**: 2026-02-15  
**버전**: 3.0.0  
**Status**: ✅ 프론트엔드 DB 스키마 통합 완료
