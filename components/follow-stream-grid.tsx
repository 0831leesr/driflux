"use client"

import { useState, useEffect } from "react"
import type { ReactNode } from "react"
import { StreamCard, type StreamData } from "@/components/stream-card"
import { Button } from "@/components/ui/button"

const ROWS_PER_LOAD = 4
const CARDS_PER_ROW = 4
const CARDS_PER_LOAD = ROWS_PER_LOAD * CARDS_PER_ROW

interface FollowStreamGridProps {
  title: string
  icon: ReactNode
  streams: StreamData[]
  onStreamClick?: (stream: StreamData) => void
  emptyMessage?: string
}

export function FollowStreamGrid({
  title,
  icon,
  streams,
  onStreamClick,
  emptyMessage,
}: FollowStreamGridProps) {
  const [displayCount, setDisplayCount] = useState(CARDS_PER_LOAD)

  useEffect(() => {
    setDisplayCount(CARDS_PER_LOAD)
  }, [streams])

  const streamsToShow = streams.slice(0, displayCount)
  const hasMore = streams.length > displayCount

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + CARDS_PER_LOAD)
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          {icon}
          {title}
        </h2>
      </div>
      {streams.length === 0 && emptyMessage ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-border bg-card/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card-grid-4-wrapper -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="card-grid-4">
              {streamsToShow.map((stream, index) => (
                <StreamCard
                  key={`${stream.streamerName}-${stream.id ?? index}`}
                  stream={stream}
                  onStreamClick={onStreamClick}
                  priority={index < 4}
                />
              ))}
            </div>
          </div>
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="lg"
                onClick={handleLoadMore}
                className="min-w-[140px] border-border"
              >
                더 보기
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
