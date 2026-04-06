"use client"

import { useId, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { SteamPopularReview } from "@/lib/steam"

const PAGE_SIZE = 2

function formatPlaytimeLine(item: SteamPopularReview): string {
  const { playtime_hours: h, playtime_minutes: m } = item
  if (m <= 0) return "기록 없음"
  if (h === 0) return `${m}분`
  return `${h}시간`
}

function ReviewPreviewBlock({ item }: { item: SteamPopularReview }) {
  const [open, setOpen] = useState(false)
  const fullTextId = useId()

  return (
    <article
      className={cn(
        "flex h-full min-h-[7.5rem] flex-col rounded-xl border p-4 shadow-sm backdrop-blur-sm transition-colors",
        item.voted_up
          ? "border-sky-300/90 bg-sky-100/90 hover:border-sky-400/90 dark:border-sky-900/80 dark:bg-sky-950/60 dark:hover:border-sky-800"
          : "border-red-300/90 bg-red-100/90 hover:border-red-400/90 dark:border-red-950/80 dark:bg-red-950/55 dark:hover:border-red-900"
      )}
    >
      <div className="mb-2 flex shrink-0 items-start justify-between gap-2">
        <span
          className={cn(
            "select-none text-lg leading-none",
            item.voted_up
              ? "text-sky-700 dark:text-sky-300"
              : "text-red-700 dark:text-red-300"
          )}
          title={item.voted_up ? "추천" : "비추천"}
          role="img"
          aria-label={item.voted_up ? "추천 리뷰" : "비추천 리뷰"}
        >
          {item.voted_up ? "👍" : "👎"}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          🕒 {formatPlaytimeLine(item)}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <p
          className={cn(
            "min-h-0 overflow-hidden break-words text-sm leading-relaxed text-foreground/95",
            "line-clamp-4"
          )}
        >
          {item.review}
        </p>
        <div className="mt-auto shrink-0">
          <Popover open={open} onOpenChange={setOpen} modal={false}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs font-medium text-[hsl(var(--neon-purple))] no-underline hover:no-underline"
                aria-expanded={open}
                aria-controls={fullTextId}
              >
                더보기
              </Button>
            </PopoverTrigger>
            <PopoverContent
              id={fullTextId}
              align="start"
              side="bottom"
              sideOffset={6}
              collisionPadding={12}
              className={cn(
                "max-h-[min(50vh,18rem)] w-[min(100vw-2rem,26rem)] max-w-[min(100vw-2rem,26rem)] overflow-y-auto border-border bg-card p-3 text-foreground shadow-lg",
                "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1"
              )}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/95">
                {item.review}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3 h-8 w-full text-muted-foreground hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                닫기
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </article>
  )
}

export function SteamReviewsCarousel({ reviews }: { reviews: SteamPopularReview[] }) {
  const [page, setPage] = useState(0)

  const totalPages = Math.max(1, Math.ceil(reviews.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const start = safePage * PAGE_SIZE
  const pageItems = reviews.slice(start, start + PAGE_SIZE)

  const canPrev = safePage > 0
  const canNext = safePage < totalPages - 1

  return (
    <div className="min-w-0">
      <div className="flex items-stretch gap-2 sm:gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-auto min-h-[7rem] shrink-0 border-border"
          disabled={!canPrev}
          aria-label="이전 리뷰"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="grid min-h-[9rem] min-w-0 flex-1 grid-cols-1 items-stretch gap-3 sm:min-h-[10.5rem] sm:grid-cols-2 md:min-h-[11.5rem]">
          {pageItems.map((item, i) => (
            <ReviewPreviewBlock key={start + i} item={item} />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-auto min-h-[7rem] shrink-0 border-border"
          disabled={!canNext}
          aria-label="다음 리뷰"
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
