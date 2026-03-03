"use client"

import { useState, useEffect } from "react"
import type { ReactNode } from "react"
import { ClipCard, type ClipData } from "@/components/clip-card"
import { Button } from "@/components/ui/button"
import { useFavoriteClips } from "@/contexts/favorites-context"

const ROWS_PER_LOAD = 4
const CARDS_PER_ROW = 4
const CARDS_PER_LOAD = ROWS_PER_LOAD * CARDS_PER_ROW

interface SavedClipGridProps {
  title: string
  icon: ReactNode
  onClipClick?: (clip: ClipData) => void
  emptyMessage?: string
}

export function SavedClipGrid({
  title,
  icon,
  onClipClick,
  emptyMessage,
}: SavedClipGridProps) {
  const { savedClips, isInitialized } = useFavoriteClips()
  const [displayCount, setDisplayCount] = useState(CARDS_PER_LOAD)

  // Newest saved first
  const orderedClips = [...savedClips].reverse()

  useEffect(() => {
    setDisplayCount(CARDS_PER_LOAD)
  }, [savedClips.length])

  const clipsToShow = orderedClips.slice(0, displayCount)
  const hasMore = orderedClips.length > displayCount

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + CARDS_PER_LOAD)
  }

  if (!isInitialized) {
    return (
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            {icon}
            {title}
          </h2>
        </div>
        <div className="flex flex-1 items-center justify-center rounded-xl border border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        </div>
      </section>
    )
  }

  if (savedClips.length === 0 && emptyMessage) {
    return (
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            {icon}
            {title}
          </h2>
        </div>
        <div className="flex flex-1 items-center justify-center rounded-xl border border-border bg-card/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          {icon}
          {title}
        </h2>
      </div>
      <div className="space-y-6">
        <div className="card-grid-4-wrapper -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="card-grid-4">
            {clipsToShow.map((clip, index) => (
              <ClipCard
                key={clip.clipUID}
                clip={clip}
                onClipClick={onClipClick}
                priority={index < 4}
                showSaveButton
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
    </section>
  )
}
