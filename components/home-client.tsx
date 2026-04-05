"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Gamepad2, Tags, Video, Bookmark, UserCircle2, Scissors } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingGames } from "@/components/trending-games"
import { RisingGames } from "@/components/rising-games"
import { DropsSection } from "@/components/drops-section"
import { HiddenGemsSection } from "@/components/hidden-gems-section"
import { NewReleasesSection } from "@/components/new-releases-section"
import type {
  TrendingGameRow,
  HistoricalTrendingRow,
  GamesWithDropsRow,
  HiddenGemsRow,
  NewReleasesRow,
  EsportsChannel,
} from "@/lib/data"
import type { HistoricalTrendingRanges } from "@/lib/trending-date-range"
import { FollowStreamGrid } from "@/components/follow-stream-grid"
import { FollowReplayGrid } from "@/components/follow-replay-grid"
import { SavedReplayGrid } from "@/components/saved-replay-grid"
import { SavedClipGrid } from "@/components/saved-clip-grid"
import type { StreamData } from "@/components/stream-card"
import type { VideoData } from "@/components/video-card"
import type { ClipData } from "@/components/clip-card"
import { CalendarContent } from "@/components/calendar-content"
import type { EventRow } from "@/lib/types"
import { useFavoriteGames, useFavoriteTags, useFavoriteStreamers, useFavoritesSession } from "@/contexts/favorites-context"
import { fetchStreamsForFollowedGames, fetchStreamsForFollowedTags } from "@/lib/data"
import { formatViewerCountShort } from "@/lib/utils"
interface HomeClientProps {
  trendingLive: TrendingGameRow[]
  risingTrendingGames: TrendingGameRow[]
  historicalTrendingRanges: HistoricalTrendingRanges
  yesterdayTrending: HistoricalTrendingRow[]
  weekTrending: HistoricalTrendingRow[]
  monthTrending: HistoricalTrendingRow[]
  gamesWithDrops: GamesWithDropsRow[]
  hiddenGemsGames: HiddenGemsRow[]
  newReleasesGames: NewReleasesRow[]
  upcomingEvents: EventRow[]
  esportsChannels: EsportsChannel[]
}

export function HomeClient({
  trendingLive,
  risingTrendingGames,
  historicalTrendingRanges,
  yesterdayTrending,
  weekTrending,
  monthTrending,
  gamesWithDrops,
  hiddenGemsGames,
  newReleasesGames,
  upcomingEvents,
  esportsChannels,
}: HomeClientProps) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const activeTab = tabParam === "follow" || tabParam === "calendar" ? tabParam : "main"

  const yesterdayTrendingIds = useMemo(
    () => new Set(yesterdayTrending.map((g) => g.id)),
    [yesterdayTrending],
  )
  const [followSubTab, setFollowSubTab] = useState<"games" | "tags" | "replay" | "saved" | "streamers">("games")
  const [savedSubTab, setSavedSubTab] = useState<"replay" | "clips">("replay")
  const { isAuthenticated, sessionResolved } = useFavoritesSession()
  const followEmptyMessage = (authedMessage: string) =>
    sessionResolved && !isAuthenticated ? "로그인 후 팔로우를 이용 가능합니다." : authedMessage

  const { favorites: favoriteGameIds, isInitialized: gamesInitialized } = useFavoriteGames()
  const { favorites: favoriteTags, isInitialized: tagsInitialized } = useFavoriteTags()
  const { favorites: favoriteStreamers, isInitialized: streamersInitialized } = useFavoriteStreamers()
  const [followedStreams, setFollowedStreams] = useState<StreamData[]>([])
  const [followedTagStreams, setFollowedTagStreams] = useState<StreamData[]>([])
  const [followedStreamerStreams, setFollowedStreamerStreams] = useState<StreamData[]>([])

  useEffect(() => {
    async function loadFollowedStreams() {
      if (!gamesInitialized) return
      
      if (favoriteGameIds.length === 0) {
        setFollowedStreams([])
        return
      }
      
      try {
        const streams = await fetchStreamsForFollowedGames(favoriteGameIds)
        setFollowedStreams(streams)
      } catch (error) {
        console.error("Error loading followed streams:", error)
      }
    }
    
    loadFollowedStreams()
  }, [favoriteGameIds, gamesInitialized])

  useEffect(() => {
    async function loadFollowedTagStreams() {
      if (!tagsInitialized) return
      
      if (favoriteTags.length === 0) {
        setFollowedTagStreams([])
        return
      }
      
      try {
        const streams = await fetchStreamsForFollowedTags(favoriteTags)
        setFollowedTagStreams(streams)
      } catch (error) {
        console.error("Error loading followed tag streams:", error)
      }
    }
    
    loadFollowedTagStreams()
  }, [favoriteTags, tagsInitialized])

  useEffect(() => {
    async function loadFollowedStreamerStreams() {
      if (!streamersInitialized || favoriteStreamers.length === 0) {
        setFollowedStreamerStreams([])
        return
      }

      try {
        const res = await fetch("/api/streamers/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelIds: favoriteStreamers.map((s) => s.channelId),
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? "Failed to fetch")
        const data = (json.data ?? []) as Array<{
          chzzk_channel_id: string
          title: string
          thumbnail_url: string | null
          is_live: boolean
          viewer_count: number
          category?: string
        }>
        const nameMap = Object.fromEntries(
          favoriteStreamers.map((s) => [s.channelId, s.streamerName])
        )
        const imageMap = Object.fromEntries(
          favoriteStreamers
            .filter((s) => s.channelImageUrl)
            .map((s) => [s.channelId, s.channelImageUrl!])
        )
        const streams: StreamData[] = data
          .filter((d) => d.is_live)
          .map((d) => {
            const id = Math.abs(
              d.chzzk_channel_id.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
            )
            return {
              id,
              thumbnail: d.thumbnail_url ?? "/streams/stream-1.jpg",
              gameCover: d.thumbnail_url ?? "/streams/stream-1.jpg",
              gameTitle: d.category ?? "알 수 없음",
              streamTitle: d.title,
              streamerName: nameMap[d.chzzk_channel_id] ?? "알 수 없음",
              viewers: d.viewer_count,
              viewersFormatted: formatViewerCountShort(d.viewer_count),
              isLive: true,
              channelId: d.chzzk_channel_id,
              channelImageUrl: imageMap[d.chzzk_channel_id],
            }
          })
        setFollowedStreamerStreams(streams)
      } catch (error) {
        console.error("Error loading followed streamer streams:", error)
        setFollowedStreamerStreams([])
      }
    }

    loadFollowedStreamerStreams()
  }, [favoriteStreamers, streamersInitialized])

  const CHZZK_LIVE_URL = "https://chzzk.naver.com/live"
  const CHZZK_VIDEO_URL = "https://chzzk.naver.com/video"
  function handleStreamClick(stream: StreamData) {
    const url = stream?.url ?? (stream?.channelId ? `${CHZZK_LIVE_URL}/${stream.channelId}` : null)
    if (url) window.open(url, "_blank")
  }
  function handleVideoClick(video: VideoData) {
    const url = video?.videoId ? `${CHZZK_VIDEO_URL}/${video.videoId}` : null
    if (url) window.open(url, "_blank")
  }
  const CHZZK_CLIP_URL = "https://chzzk.naver.com/clips"
  function handleClipClick(clip: ClipData) {
    const url = clip?.clipUID ? `${CHZZK_CLIP_URL}/${clip.clipUID}` : null
    if (url) window.open(url, "_blank")
  }

  /* Use followed streams, show empty if no favorites */
  const followingGamesStreams = followedStreams
  const followingTagsStreams = followedTagStreams
  const followingStreamerStreams = followedStreamerStreams

  return (
      <div className="w-full min-w-0">
        {activeTab === "main" ? (
          <div className="flex flex-col gap-8 p-4 lg:p-6">
            <div className="flex flex-col gap-8 sm:gap-10">
              <TrendingGames
                liveGames={trendingLive}
                historicalTrendingRanges={historicalTrendingRanges}
                yesterdayGames={yesterdayTrending}
                weekGames={weekTrending}
                monthGames={monthTrending}
                yesterdayTrendingIds={yesterdayTrendingIds}
              />
              <RisingGames games={risingTrendingGames} yesterdayTrendingIds={yesterdayTrendingIds} />
            </div>
            <DropsSection games={gamesWithDrops} yesterdayTrendingIds={yesterdayTrendingIds} />
            <HiddenGemsSection games={hiddenGemsGames} yesterdayTrendingIds={yesterdayTrendingIds} />
            <NewReleasesSection games={newReleasesGames} yesterdayTrendingIds={yesterdayTrendingIds} />
          </div>
        ) : activeTab === "follow" ? (
          <div className="flex flex-col p-4 lg:p-6">
            <Tabs value={followSubTab} onValueChange={(v) => setFollowSubTab(v as "games" | "tags" | "replay" | "saved" | "streamers")} className="w-full">
              <TabsList className="mb-4 h-10 bg-muted/50 p-1">
                <TabsTrigger value="games" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Gamepad2 className="h-4 w-4" />
                  게임
                </TabsTrigger>
                <TabsTrigger value="tags" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Tags className="h-4 w-4" />
                  태그
                </TabsTrigger>
                <TabsTrigger value="streamers" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <UserCircle2 className="h-4 w-4" />
                  스트리머
                </TabsTrigger>
                <TabsTrigger value="replay" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Video className="h-4 w-4" />
                  다시보기
                </TabsTrigger>
                <TabsTrigger value="saved" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Bookmark className="h-4 w-4" />
                  저장
                </TabsTrigger>
              </TabsList>
              <div className="flex-1">
                {followSubTab === "games" && (
                  <FollowStreamGrid
                    title="팔로우 중인 게임"
                    icon={<Gamepad2 className="h-5 w-5 text-[hsl(var(--neon-purple))]" />}
                    streams={followingGamesStreams}
                    onStreamClick={handleStreamClick}
                    emptyMessage={followEmptyMessage(
                      "팔로우 중인 게임이 없습니다. 게임을 팔로우하면 여기서 라이브 스트림을 확인할 수 있습니다!",
                    )}
                  />
                )}
                {followSubTab === "tags" && (
                  <FollowStreamGrid
                    title="팔로우 중인 태그"
                    icon={<Tags className="h-5 w-5 text-[hsl(var(--neon-green))]" />}
                    streams={followingTagsStreams}
                    onStreamClick={handleStreamClick}
                    emptyMessage={followEmptyMessage(
                      "팔로우 중인 태그가 없습니다. 태그를 팔로우하면 여기서 라이브 스트림을 확인할 수 있습니다!",
                    )}
                  />
                )}
                {followSubTab === "streamers" && (
                  <FollowStreamGrid
                    title="팔로우 중인 스트리머"
                    icon={<UserCircle2 className="h-5 w-5 text-[hsl(var(--neon-purple))]" />}
                    streams={followingStreamerStreams}
                    onStreamClick={handleStreamClick}
                    emptyMessage={followEmptyMessage(
                      "팔로우 중인 스트리머가 없습니다. 스트리밍 카드에서 팔로우 버튼을 누르면 여기서 라이브 스트림을 확인할 수 있습니다!",
                    )}
                  />
                )}
                {followSubTab === "replay" && (
                  <FollowReplayGrid
                    title="팔로우 중인 게임의 다시보기"
                    icon={<Video className="h-5 w-5 text-[hsl(var(--neon-purple))]" />}
                    gameIds={favoriteGameIds}
                    onVideoClick={handleVideoClick}
                    emptyMessage={followEmptyMessage(
                      "팔로우 중인 게임이 없습니다. 게임을 팔로우하면 여기서 다시보기 영상을 확인할 수 있습니다!",
                    )}
                  />
                )}
                {followSubTab === "saved" && (
                  <Tabs
                    value={savedSubTab}
                    onValueChange={(v) => setSavedSubTab(v as "replay" | "clips")}
                    className="w-full"
                  >
                    <TabsList className="mb-4 h-10 bg-muted/30 p-1 w-fit">
                      <TabsTrigger value="replay" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Video className="h-4 w-4" />
                        다시보기
                      </TabsTrigger>
                      <TabsTrigger value="clips" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Scissors className="h-4 w-4" />
                        클립
                      </TabsTrigger>
                    </TabsList>
                    <div className="flex-1">
                      {savedSubTab === "replay" && (
                        <SavedReplayGrid
                          title="저장한 다시보기"
                          icon={<Video className="h-5 w-5 text-[hsl(var(--neon-purple))]" />}
                          onVideoClick={handleVideoClick}
                          emptyMessage="저장한 다시보기 영상이 없습니다. 다시보기 영상에 북마크를 추가하면 여기서 확인할 수 있습니다!"
                        />
                      )}
                      {savedSubTab === "clips" && (
                        <SavedClipGrid
                          title="저장한 클립"
                          icon={<Scissors className="h-5 w-5 text-[hsl(var(--neon-purple))]" />}
                          onClipClick={handleClipClick}
                          emptyMessage="저장한 클립 영상이 없습니다. 클립 영상에 북마크를 추가하면 여기서 확인할 수 있습니다!"
                        />
                      )}
                    </div>
                  </Tabs>
                )}
              </div>
            </Tabs>
          </div>
        ) : activeTab === "calendar" ? (
          <CalendarContent events={upcomingEvents} esportsChannels={esportsChannels} />
        ) : null}
      </div>
  )
}
