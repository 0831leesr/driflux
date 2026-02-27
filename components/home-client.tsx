"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Gamepad2, ExternalLink, Tags, Video, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingGames } from "@/components/trending-games"
import type { TrendingGameRow, EsportsChannel } from "@/lib/data"
import { FollowStreamGrid } from "@/components/follow-stream-grid"
import type { StreamData } from "@/components/stream-card"
import { CalendarContent } from "@/components/calendar-content"
import type { EventRow } from "@/lib/types"
import { ExploreTabContent } from "@/components/explore/explore-tab-content"
import { useFavoriteGames, useFavoriteTags } from "@/contexts/favorites-context"
import { fetchStreamsForFollowedGames, fetchStreamsForFollowedTags } from "@/lib/data"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface HomeClientProps {
  liveStreams: StreamData[]
  trendingGames: TrendingGameRow[]
  upcomingEvents: EventRow[]
  esportsChannels: EsportsChannel[]
}

export function HomeClient({ liveStreams, trendingGames, upcomingEvents, esportsChannels }: HomeClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("main")
  const [followSubTab, setFollowSubTab] = useState<"games" | "tags" | "replay" | "saved">("games")
  const [streamModalOpen, setStreamModalOpen] = useState(false)
  const [selectedStream, setSelectedStream] = useState<StreamData | null>(null)
  const { favorites: favoriteGameIds, isInitialized: gamesInitialized } = useFavoriteGames()
  const { favorites: favoriteTags, isInitialized: tagsInitialized } = useFavoriteTags()
  const [followedStreams, setFollowedStreams] = useState<StreamData[]>([])
  const [followedTagStreams, setFollowedTagStreams] = useState<StreamData[]>([])

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

  const CHZZK_LIVE_URL = "https://chzzk.naver.com/live"
  function handleStreamClick(stream: StreamData) {
    setSelectedStream(stream)
    setStreamModalOpen(true)
  }
  function handleContinueToExternal() {
    const url = selectedStream?.url ?? (selectedStream?.channelId ? `${CHZZK_LIVE_URL}/${selectedStream.channelId}` : null)
    if (url) window.open(url, "_blank")
    setStreamModalOpen(false)
  }

  /* Use followed streams, show empty if no favorites */
  const followingGamesStreams = followedStreams
  const followingTagsStreams = followedTagStreams

  return (
    <>
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border/50 bg-card/80 backdrop-blur-xl px-4 lg:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="h-10 bg-transparent p-0">
            <TabsTrigger
              value="main"
              className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-[hsl(var(--neon-purple))] data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              메인
            </TabsTrigger>
            <TabsTrigger
              value="follow"
              className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-[hsl(var(--neon-purple))] data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              팔로우
            </TabsTrigger>
            <TabsTrigger
              value="explore"
              className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-[hsl(var(--neon-purple))] data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              탐색
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-[hsl(var(--neon-purple))] data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              캘린더
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === "main" ? (
          <div className="flex flex-col gap-8 p-4 lg:p-6">
            <TrendingGames games={trendingGames} />
          </div>
        ) : activeTab === "follow" ? (
          <div className="flex flex-col p-4 lg:p-6">
            <Tabs value={followSubTab} onValueChange={(v) => setFollowSubTab(v as "games" | "tags" | "replay" | "saved")} className="w-full">
              <TabsList className="mb-4 h-10 bg-muted/50 p-1">
                <TabsTrigger value="games" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Gamepad2 className="h-4 w-4" />
                  게임
                </TabsTrigger>
                <TabsTrigger value="tags" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Tags className="h-4 w-4" />
                  태그
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
                    emptyMessage="팔로우 중인 게임이 없습니다. 게임을 팔로우하면 여기서 라이브 스트림을 확인할 수 있습니다!"
                  />
                )}
                {followSubTab === "tags" && (
                  <FollowStreamGrid
                    title="팔로우 중인 태그"
                    icon={<Tags className="h-5 w-5 text-[hsl(var(--neon-green))]" />}
                    streams={followingTagsStreams}
                    onStreamClick={handleStreamClick}
                    emptyMessage="팔로우 중인 태그가 없습니다. 태그를 팔로우하면 여기서 라이브 스트림을 확인할 수 있습니다!"
                  />
                )}
                {followSubTab === "replay" && (
                  <div className="flex flex-1 items-center justify-center rounded-xl border border-border bg-card/50 p-12 text-center">
                    <p className="text-sm text-muted-foreground">추후 업데이트 예정입니다.</p>
                  </div>
                )}
                {followSubTab === "saved" && (
                  <div className="flex flex-1 items-center justify-center rounded-xl border border-border bg-card/50 p-12 text-center">
                    <p className="text-sm text-muted-foreground">추후 업데이트 예정입니다.</p>
                  </div>
                )}
              </div>
            </Tabs>
          </div>
        ) : activeTab === "explore" ? (
          <ExploreTabContent onStreamClick={handleStreamClick} />
        ) : activeTab === "calendar" ? (
          <CalendarContent events={upcomingEvents} esportsChannels={esportsChannels} />
        ) : null}
      </main>

      {/* Stream Modal */}
      <AlertDialog open={streamModalOpen} onOpenChange={setStreamModalOpen}>
        <AlertDialogContent className="border-border bg-card text-foreground">
          <AlertDialogHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--neon-purple))]/15">
              <ExternalLink className="h-6 w-6 text-[hsl(var(--neon-purple))]" />
            </div>
            <AlertDialogTitle className="text-foreground">
              Watch on External Site?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              You are being redirected to the streaming site (Chzzk). Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-secondary text-foreground hover:bg-secondary/80 hover:text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--neon-purple))]/80"
              onClick={handleContinueToExternal}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
