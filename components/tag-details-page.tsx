"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Radio, ExternalLink, Heart, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StreamCard, type StreamData } from "@/components/stream-card"
import { useFavoriteTags } from "@/contexts/favorites-context"
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

interface TagDetailsPageProps {
  tagName: string
  streams: StreamData[]
}

export function TagDetailsPage({ tagName, streams }: TagDetailsPageProps) {
  const [contentTab, setContentTab] = useState("live")
  const [streamModalOpen, setStreamModalOpen] = useState(false)
  const { isFavorite, toggleFavorite } = useFavoriteTags()
  const isFollowing = isFavorite(tagName)

  // Calculate total viewers
  const totalViewers = streams.reduce((sum, stream) => sum + (stream.viewers || 0), 0)
  const viewersFormatted = totalViewers >= 1000 
    ? `${(totalViewers / 1000).toFixed(1)}K` 
    : String(totalViewers)

  function handleStreamClick() {
    setStreamModalOpen(true)
  }

  function handleFollowClick() {
    toggleFavorite(tagName)
  }

  return (
    <>
      <div className="flex flex-col">
        {/* Back Button */}
        <div className="px-4 pt-4 lg:px-6">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>

        {/* Hero Section */}
        <div className="relative mx-4 mt-3 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[hsl(var(--neon-purple))]/10 via-card to-card lg:mx-6">
          {/* Hero Content */}
          <div className="relative flex flex-col gap-4 p-6 sm:p-8">
            {/* Tag Info */}
            <div className="flex flex-col gap-4">
              <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                #{tagName}
              </h1>

              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Radio className="h-4 w-4 text-[hsl(var(--live-red))]" />
                  <span className="font-semibold">{streams.length}</span>
                  <span className="text-muted-foreground">Live Channels</span>
                </span>
                <span className="flex items-center gap-1.5 text-foreground">
                  <Users className="h-4 w-4 text-[hsl(var(--neon-purple))]" />
                  <span className="font-semibold">{viewersFormatted}</span>
                  <span className="text-muted-foreground">Viewers</span>
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleFollowClick}
                  className={
                    isFollowing
                      ? "bg-[hsl(var(--neon-purple))]/15 text-[hsl(var(--neon-purple))] hover:bg-[hsl(var(--neon-purple))]/25"
                      : "bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--neon-purple))]/80"
                  }
                >
                  <Heart
                    className={`mr-2 h-4 w-4 ${isFollowing ? "fill-current" : ""}`}
                  />
                  {isFollowing ? "Following" : "Follow Tag"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="mt-6 border-b border-border/50 px-4 lg:px-6">
          <Tabs value={contentTab} onValueChange={setContentTab}>
            <TabsList className="h-10 bg-transparent p-0">
              <TabsTrigger
                value="live"
                className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-[hsl(var(--neon-purple))] data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Live Streams
                <Badge className="ml-2 border-transparent bg-[hsl(var(--live-red))]/15 px-1.5 py-0 text-[10px] font-medium text-[hsl(var(--live-red))]">
                  {streams.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Tab Content */}
        <div className="flex flex-col gap-6 p-4 lg:p-6">
          {streams.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {streams.map((stream, i) => (
                <StreamCard
                  key={`${stream.streamerName}-${i}`}
                  stream={stream}
                  onStreamClick={handleStreamClick}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Radio className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold text-foreground">No live streams</h3>
              <p className="text-sm text-muted-foreground">
                There are no live streams for this tag right now.
              </p>
            </div>
          )}
        </div>
      </div>

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
