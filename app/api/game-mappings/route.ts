import { NextResponse } from "next/server"
import { CHZZK_STEAM_MAPPINGS, getMappingStats, findMappedSteamAppId } from "@/lib/game-mappings"

/**
 * Game Mappings API
 * 
 * 치지직 → 스팀 매핑 상태 확인
 * 
 * Examples:
 * GET /api/game-mappings              - 전체 매핑 보기
 * GET /api/game-mappings?stats=true   - 통계만 보기
 * GET /api/game-mappings?game=리그 오브 레전드 - 특정 게임 확인
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const statsOnly = searchParams.get("stats") === "true"
  const gameName = searchParams.get("game")

  // 특정 게임 검색
  if (gameName) {
    const appId = findMappedSteamAppId(gameName)
    
    return NextResponse.json({
      game: gameName,
      appId: appId === undefined ? "NOT_MAPPED" : appId === null ? "NOT_ON_STEAM" : appId,
      status: appId === undefined ? "⚠️ Not mapped - will try automatic search" 
            : appId === null ? "⊗ Not on Steam - will skip"
            : "✓ Mapped to Steam",
      steamUrl: typeof appId === "number" ? `https://store.steampowered.com/app/${appId}` : null,
    })
  }

  // 통계
  const stats = getMappingStats()

  if (statsOnly) {
    return NextResponse.json({
      stats,
      message: `Total: ${stats.total} mappings (${stats.steamGames} on Steam, ${stats.nonSteamGames} not on Steam)`,
    })
  }

  // 전체 매핑
  const mappings = Object.entries(CHZZK_STEAM_MAPPINGS).map(([name, appId]) => ({
    chzzkName: name,
    steamAppId: appId,
    status: appId === null ? "NOT_ON_STEAM" : "ON_STEAM",
    steamUrl: appId !== null ? `https://store.steampowered.com/app/${appId}` : null,
  }))

  // 그룹별로 정렬
  const steamGames = mappings.filter(m => m.status === "ON_STEAM")
  const nonSteamGames = mappings.filter(m => m.status === "NOT_ON_STEAM")

  return NextResponse.json({
    stats,
    mappings: {
      steamGames,
      nonSteamGames,
    },
  })
}
