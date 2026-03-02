"use client"

import { Radio } from "lucide-react"
import { StreamCard, type StreamData } from "@/components/stream-card"

interface SearchStreamsSectionProps {
  streams: StreamData[]
}

const CHZZK_LIVE_URL = "https://chzzk.naver.com/live"

export function SearchStreamsSection({ streams }: SearchStreamsSectionProps) {
  function handleStreamClick(stream: StreamData) {
    const url = stream?.url ?? (stream?.channelId ? `${CHZZK_LIVE_URL}/${stream.channelId}` : null)
    if (url) window.open(url, "_blank")
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
    </>
  )
}
