import { NextResponse } from "next/server"
import { getGameMappings, resolveMapping } from "@/lib/mappings"

/**
 * Game Mappings API
 *
 * DB 기반 game_mappings 테이블 조회
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

  const mappings = await getGameMappings()

  // 특정 게임 검색
  if (gameName) {
    const mapping = resolveMapping(mappings, gameName, gameName)

    if (!mapping) {
      return NextResponse.json({
        game: gameName,
        status: "NOT_MAPPED",
        message: "DB에 매핑 없음 - 자동 검색 시도",
        steam_appid: null,
        steamUrl: null,
      })
    }

    const steam_appid = mapping.steam_appid
    return NextResponse.json({
      game: gameName,
      chzzk_title: mapping.chzzk_title,
      steam_appid,
      skip_steam: mapping.skip_steam,
      skip_igdb: mapping.skip_igdb,
      steam_title: mapping.steam_title,
      igdb_title: mapping.igdb_title,
      status: mapping.skip_steam
        ? "SKIP_STEAM"
        : steam_appid != null
          ? "ON_STEAM"
          : "NOT_ON_STEAM",
      steamUrl: steam_appid != null ? `https://store.steampowered.com/app/${steam_appid}` : null,
      overrides: {
        cover_image: !!mapping.override_cover_image,
        header_image: !!mapping.override_header_image,
        background_image: !!mapping.override_background_image,
        price: mapping.override_price != null,
        is_free: mapping.override_is_free != null,
      },
    })
  }

  // 통계
  const uniqueMappings = Array.from(
    new Map(Object.values(mappings).map((m) => [m.chzzk_title, m])).values()
  )
  const steamGames = uniqueMappings.filter((m) => m.steam_appid != null && !m.skip_steam)
  const nonSteamGames = uniqueMappings.filter((m) => m.skip_steam || m.steam_appid === null)
  const stats = {
    total: uniqueMappings.length,
    steamGames: steamGames.length,
    nonSteamGames: nonSteamGames.length,
    uniqueAppIds: new Set(steamGames.map((m) => m.steam_appid)).size,
  }

  if (statsOnly) {
    return NextResponse.json({
      stats,
      message: `Total: ${stats.total} mappings (${stats.steamGames} on Steam, ${stats.nonSteamGames} not on Steam)`,
    })
  }

  // 전체 매핑
  const steamList = steamGames.map((m) => ({
    chzzk_title: m.chzzk_title,
    steam_appid: m.steam_appid,
    status: "ON_STEAM",
    steamUrl: m.steam_appid != null ? `https://store.steampowered.com/app/${m.steam_appid}` : null,
  }))
  const nonSteamList = nonSteamGames.map((m) => ({
    chzzk_title: m.chzzk_title,
    steam_appid: null,
    status: "SKIP_STEAM",
    steamUrl: null,
  }))

  return NextResponse.json({
    stats,
    mappings: {
      steamGames: steamList,
      nonSteamGames: nonSteamList,
    },
  })
}
