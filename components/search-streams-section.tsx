"use client"

import { useState } from "react"
import { Radio, ExternalLink } from "lucide-react"
import { StreamCard, type StreamData } from "@/components/stream-card"
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

interface SearchStreamsSectionProps {
  streams: StreamData[]
}

const CHZZK_LIVE_URL = "https://chzzk.naver.com/live"

export function SearchStreamsSection({ streams }: SearchStreamsSectionProps) {
  const [streamModalOpen, setStreamModalOpen] = useState(false)
  const [selectedStream, setSelectedStream] = useState<StreamData | null>(null)

  function handleStreamClick(stream: StreamData) {
    setSelectedStream(stream)
    setStreamModalOpen(true)
  }
  function handleContinueToExternal() {
    const url = selectedStream?.url ?? (selectedStream?.channelId ? `${CHZZK_LIVE_URL}/${selectedStream.channelId}` : null)
    if (url) window.open(url, "_blank")
    setStreamModalOpen(false)
  }

  if (streams.length === 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Related Live Streams</h2>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Radio className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">관련 방송이 없습니다.</p>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Related Live Streams</h2>
        <div className="card-grid-4-wrapper -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="card-grid-4">
          {streams.map((stream, i) => (
            <StreamCard
              key={`${stream.id}-${i}`}
              stream={stream}
              onStreamClick={handleStreamClick}
            />
          ))}
          </div>
        </div>
      </section>

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
