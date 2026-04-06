"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { SteamPopularReview } from "@/lib/steam"

const PREVIEW_MAX = 30
const PAGE_SIZE = 2

function formatPlaytimeLine(item: SteamPopularReview): string {
  const { playtime_hours: h, playtime_minutes: m } = item
  if (m <= 0) return "기록 없음"
  if (h === 0) return `${m}분`
  return `${h}시간`
}

function ReviewPreviewBlock({
  item,
  onOpenFull,
}: {
  item: SteamPopularReview
  onOpenFull: () => void
}) {
  const needsMore = item.review.length > PREVIEW_MAX
  const preview = needsMore ? `${item.review.slice(0, PREVIEW_MAX)}...` : item.review

  return (
    <article
      className={cn(
        "flex min-h-[7rem] flex-col rounded-xl border p-4 shadow-sm backdrop-blur-sm transition-colors",
        item.voted_up
          ? "border-sky-300/90 bg-sky-100/90 hover:border-sky-400/90 dark:border-sky-900/80 dark:bg-sky-950/60 dark:hover:border-sky-800"
          : "border-red-300/90 bg-red-100/90 hover:border-red-400/90 dark:border-red-950/80 dark:bg-red-950/55 dark:hover:border-red-900"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
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
      <div className="flex-1 text-sm leading-relaxed text-foreground/95">
        <span>{preview}</span>
        {needsMore ? (
          <Button
            type="button"
            variant="link"
            className="inline h-auto min-h-0 p-0 pl-1 align-baseline text-xs font-medium text-[hsl(var(--neon-purple))] no-underline hover:no-underline"
            onClick={onOpenFull}
          >
            더보기
          </Button>
        ) : null}
      </div>
    </article>
  )
}

export function SteamReviewsCarousel({ reviews }: { reviews: SteamPopularReview[] }) {
  const [page, setPage] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogText, setDialogText] = useState("")

  const totalPages = Math.max(1, Math.ceil(reviews.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const start = safePage * PAGE_SIZE
  const pageItems = reviews.slice(start, start + PAGE_SIZE)

  const canPrev = safePage > 0
  const canNext = safePage < totalPages - 1

  function openFull(text: string) {
    setDialogText(text)
    setDialogOpen(true)
  }

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

        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          {pageItems.map((item, i) => (
            <ReviewPreviewBlock
              key={start + i}
              item={item}
              onOpenFull={() => openFull(item.review)}
            />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] border-border bg-card text-foreground sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">리뷰 전문</DialogTitle>
          </DialogHeader>
          <p className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/95">
            {dialogText}
          </p>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
