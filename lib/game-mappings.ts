/**
 * Chzzk Game Name → Steam AppID Mapping
 * 
 * 치지직의 게임 이름을 스팀 AppID에 매핑합니다.
 * 
 * 사용 방법:
 * 1. 매핑이 있으면 직접 AppID 사용 (가장 정확)
 * 2. null이면 스팀에 없는 게임 (검색 스킵)
 * 3. 매핑이 없으면 자동 검색 시도 (폴백)
 */

export interface GameMapping {
  chzzkName: string      // 치지직에서 표시되는 게임 이름
  steamAppId: number | null  // 스팀 AppID (null = 스팀에 없음)
  notes?: string         // 설명 (선택)
}

/**
 * 치지직 → 스팀 게임 매핑 테이블
 * 
 * null = 스팀에 없는 게임 (검색하지 않음)
 * number = 스팀 AppID
 */
export const CHZZK_STEAM_MAPPINGS: Record<string, number | null> = {
  /* ── 스팀에 없는 게임들 ── */
  // MOBA / 배틀 아레나
  "리그 오브 레전드": null,              // 라이엇 게임즈 독자 플랫폼
  "League of Legends": null,
  "LOL": null,
  "롤": null,
  
  // 배틀로얄
  "배틀그라운드 모바일": null,           // 모바일 게임
  "PUBG Mobile": null,
  
  // 카드 게임
  "하스스톤": null,                      // 배틀넷 전용
  "Hearthstone": null,
  
  // MMORPG (한국 온라인 게임)
  "던전앤파이터": null,                  // 넥슨 게임
  "메이플스토리": null,                  // 넥슨 게임
  "MapleStory": null,
  "바람의나라": null,                    // 넥슨 게임
  "리니지": null,                        // NCSOFT
  "Lineage": null,
  "리니지2": null,                       // NCSOFT
  "Lineage 2": null,
  "블레이드앤소울": null,                // NCSOFT
  "Blade & Soul": null,
  "아이온": null,                        // NCSOFT
  "AION": null,
  
  // 모바일 게임
  "명조: 워더링 웨이브": null,           // 모바일 게임
  "Wuthering Waves": null,
  "원신": null,                          // 모바일/PC (스팀 X, 자체 런처)
  "Genshin Impact": null,
  "붕괴: 스타레일": null,                // 모바일/PC (스팀 X)
  "Honkai: Star Rail": null,
  "클래시 로얄": null,                   // 모바일 게임
  "Clash Royale": null,
  "클래시 오브 클랜": null,              // 모바일 게임
  "Clash of Clans": null,
  "브롤스타즈": null,                    // 모바일 게임
  "Brawl Stars": null,
  
  // 기타 비-스팀 플랫폼
  "오버워치 2": null,                    // 배틀넷 전용
  "Overwatch 2": null,
  "디아블로 4": null,                    // 배틀넷 전용
  "Diablo IV": null,
  "월드 오브 워크래프트": null,          // 배틀넷 전용
  "World of Warcraft": null,
  "WOW": null,
  
  /* ── 스팀 게임들 (AppID 매핑) ── */
  
  // 배틀로얄
  "배틀그라운드": 578080,
  "PUBG: BATTLEGROUNDS": 578080,
  "PUBG": 578080,
  
  // 액션 RPG
  "엘든 링": 1245620,
  "Elden Ring": 1245620,
  "ELDEN RING": 1245620,
  
  // MMORPG
  "로스트아크": 1599340,
  "Lost Ark": 1599340,
  
  // 샌드박스 / 생존
  "마인크래프트": null,                   // 자체 런처 (Java), MS Store (Bedrock)
  "Minecraft": null,
  "발헤임": 892970,
  "Valheim": 892970,
  "테라리아": 105600,
  "Terraria": 105600,
  
  // 슈팅 게임
  "카운터 스트라이크 2": 730,
  "Counter-Strike 2": 730,
  "CS2": 730,
  "CS:GO": 730,
  "발로란트": null,                      // 라이엇 게임즈 독자 플랫폼
  "VALORANT": null,
  "에이펙스 레전드": 1172470,
  "Apex Legends": 1172470,
  
  // 전략 / 시뮬레이션
  "스타크래프트": null,                   // 배틀넷 전용
  "StarCraft": null,
  "스타크래프트 2": null,                 // 배틀넷 전용
  "StarCraft II": null,
  "문명 6": 289070,
  "Civilization VI": 289070,
  "스타듀 밸리": 413150,
  "Stardew Valley": 413150,
  
  // 액션 어드벤처
  "호그와트 레거시": 990080,
  "Hogwarts Legacy": 990080,
  "갓 오브 워": 1593500,
  "God of War": 1593500,
  "세키로": 814380,
  "Sekiro": 814380,
  "Sekiro: Shadows Die Twice": 814380,
  "다크소울 3": 374320,
  "Dark Souls III": 374320,
  "다크소울3": 374320,
  
  // RPG
  "사이버펑크 2077": 1091500,
  "Cyberpunk 2077": 1091500,
  "발더스 게이트 3": 1086940,
  "Baldur's Gate 3": 1086940,
  "더 위처 3": 292030,
  "The Witcher 3": 292030,
  "The Witcher 3: Wild Hunt": 292030,
  "위처3": 292030,
  
  // 스포츠
  "FC 24": 2195250,
  "EA SPORTS FC 24": 2195250,
  "FIFA 24": 2195250,
  
  // 레이싱
  "포르자 호라이즌 5": 1551360,
  "Forza Horizon 5": 1551360,
  
  // 인디 게임
  "할로우 나이트": 367520,
  "Hollow Knight": 367520,
  "셀레스트": 504230,
  "Celeste": 504230,
  "하데스": 1145360,
  "Hades": 1145360,
  "데드 셀": 588650,
  "Dead Cells": 588650,
  
  // 호러
  "레지던트 이블 4": 2050650,
  "Resident Evil 4": 2050650,
  "바이오하자드 RE:4": 2050650,
  
  // 기타 인기 게임
  "도타 2": 570,
  "Dota 2": 570,
  "팀 포트리스 2": 440,
  "Team Fortress 2": 440,
  "러스트": 252490,
  "Rust": 252490,
  "아크: 서바이벌 이볼브드": 346110,
  "ARK: Survival Evolved": 346110,
  "7 데이즈 투 다이": 251570,
  "7 Days to Die": 251570,
  "레인보우 식스 시즈": 359550,
  "Rainbow Six Siege": 359550,
  "데스티니 2": 1085660,
  "Destiny 2": 1085660,
  "워프레임": 230410,
  "Warframe": 230410,
  "팰월드": 1623730,
  "Palworld": 1623730,
  "서든어택": null,                      // 넥슨 게임
  "Sudden Attack": null,
  "서든": null,
  "카트라이더": null,                    // 넥슨 게임
  "KartRider": null,
  "카러": null,
  "피파온라인4": null,                   // 넥슨 게임
  "FIFA온라인4": null,
  "FIFA Online 4": null,
  "FC온라인": null,
  "마블 라이벌즈": 2767030,
  "Marvel Rivals": 2767030,
  "그랜드 테프트 오토 5": 271590,
  "GTA 5": 271590,
  "GTA V": 271590,
  "Grand Theft Auto V": 271590,
  "레드 데드 리뎀션 2": 1174180,
  "Red Dead Redemption 2": 1174180,
  "몬스터 헌터 월드": 582010,
  "Monster Hunter World": 582010,
  "몬스터헌터 월드": 582010,
  "던전앤파이터 듀얼": null,            // 모바일 게임
  "DNF Duel": 1216060,                   // 스팀에 있는 대전 게임
  "이터널 리턴": 1049590,
  "Eternal Return": 1049590,
  "메이플스토리 월드": null,            // 넥슨 독자 플랫폼
  "MapleStory Worlds": null,
}

/**
 * 치지직 게임 이름으로 스팀 AppID 찾기
 * 
 * @param chzzkGameName - 치지직 게임 이름
 * @returns 
 *   - number: 스팀 AppID (매핑 있음)
 *   - null: 스팀에 없는 게임 (검색 금지)
 *   - undefined: 매핑 없음 (자동 검색 시도)
 */
export function findMappedSteamAppId(chzzkGameName: string): number | null | undefined {
  // 1. 정확한 매칭 시도
  const exactMatch = CHZZK_STEAM_MAPPINGS[chzzkGameName]
  if (exactMatch !== undefined) {
    return exactMatch
  }

  // 2. 대소문자 무시 매칭
  const normalizedName = chzzkGameName.toLowerCase().trim()
  
  for (const [key, value] of Object.entries(CHZZK_STEAM_MAPPINGS)) {
    if (key.toLowerCase().trim() === normalizedName) {
      return value
    }
  }

  // 3. 매핑 없음 (자동 검색 시도 가능)
  return undefined
}

/**
 * 스팀에 없는 게임인지 확인
 * 
 * @param chzzkGameName - 치지직 게임 이름
 * @returns true면 스팀 검색 금지
 */
export function isNonSteamGame(chzzkGameName: string): boolean {
  const result = findMappedSteamAppId(chzzkGameName)
  return result === null // null = 스팀에 없음
}

/**
 * 매핑 통계
 */
export function getMappingStats() {
  const mappings = Object.entries(CHZZK_STEAM_MAPPINGS)
  const steamGames = mappings.filter(([_, appId]) => appId !== null)
  const nonSteamGames = mappings.filter(([_, appId]) => appId === null)
  
  return {
    total: mappings.length,
    steamGames: steamGames.length,
    nonSteamGames: nonSteamGames.length,
    uniqueAppIds: new Set(steamGames.map(([_, appId]) => appId)).size,
  }
}
