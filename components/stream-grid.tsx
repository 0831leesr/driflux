"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import type { ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { StreamCard, type StreamData } from "@/components/stream-card"
import { Button } from "@/components/ui/button"

interface StreamSectionProps {
  title: string
  icon: ReactNode
  streams: StreamData[]
  onStreamClick?: (stream: StreamData) => void
  emptyMessage?: string
}

export function StreamSection({ title, icon, streams, onStreamClick, emptyMessage }: StreamSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isAtStart, setIsAtStart] = useState(true)
  const [isAtEnd, setIsAtEnd] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, clientWidth, scrollWidth } = el
    setIsAtStart(scrollLeft <= 1)
    setIsAtEnd(scrollLeft + clientWidth >= scrollWidth - 1)
  }, [])

  useEffect(() => {
    updateScrollState()
  }, [streams, updateScrollState])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(updateScrollState)
    ro.observe(el)
    return () => ro.disconnect()
  }, [updateScrollState])

  const scroll = (direction: "prev" | "next") => {
    const el = scrollRef.current
    if (!el) return
    const scrollAmount = el.clientWidth
    el.scrollBy({
      left: direction === "next" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    })
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          {icon}
          {title}
        </h2>
        {streams.length > 0 && (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => scroll("prev")}
              disabled={isAtStart}
              aria-label="이전"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => scroll("next")}
              disabled={isAtEnd}
              aria-label="다음"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      {streams.length === 0 && emptyMessage ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="scrollbar-hide flex flex-row gap-6 overflow-x-auto snap-x snap-mandatory pb-2"
        >
          {streams.map((stream, i) => (
            <div
              key={`${stream.streamerName}-${i}`}
              className="min-w-[260px] max-w-[260px] shrink-0 snap-start sm:min-w-[280px] sm:max-w-[280px]"
            >
              <StreamCard stream={stream} onStreamClick={onStreamClick} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
