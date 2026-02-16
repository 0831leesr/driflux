"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Gamepad2, ExternalLink, Plus, Tags } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingGames } from "@/components/trending-games"
import { StreamSection } from "@/components/stream-grid"
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
  saleGames: any[] // Not used anymore but keeping for compatibility
  upcomingEvents: EventRow[]
}

export function HomeClient({ liveStreams, saleGames, upcomingEvents }: HomeClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("main")
  const [streamModalOpen, setStreamModalOpen] = useState(false)
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

  function handleStreamClick() {
    setStreamModalOpen(true)
  }

  /* Use followed streams, show empty if no favorites */
  const followingGamesStreams = followedStreams.slice(0, 4)
  const followingTagsStreams = followedTagStreams.slice(0, 4)

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
              Main
            </TabsTrigger>
            <TabsTrigger
              value="explore"
              className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-[hsl(var(--neon-purple))] data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Game Explore
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-[hsl(var(--neon-purple))] data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Calendar
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="mr-1 h-3 w-3" />
          Add Tab
        </Button>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === "main" ? (
          <div className="flex flex-col gap-8 p-4 lg:p-6">
            <TrendingGames />
            <StreamSection
              title="Live: My Followed Games"
              icon={<Gamepad2 className="h-5 w-5 text-[hsl(var(--neon-purple))]" />}
              streams={followingGamesStreams}
              onStreamClick={handleStreamClick}
              emptyMessage="No favorite games yet. Follow games to see their live streams here!"
            />
            <StreamSection
              title="Live: My Followed Tags"
              icon={<Tags className="h-5 w-5 text-[hsl(var(--neon-green))]" />}
              streams={followingTagsStreams}
              onStreamClick={handleStreamClick}
              emptyMessage="No favorite tags yet. Follow tags to see their live streams here!"
            />
          </div>
        ) : activeTab === "explore" ? (
          <ExploreTabContent />
        ) : activeTab === "calendar" ? (
          <CalendarContent events={upcomingEvents} />
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
            <AlertDialogAction className="bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--neon-purple))]/80">
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
