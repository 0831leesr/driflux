import { fetchSteamReviews } from "@/lib/steam"
import { SteamReviewsCarousel } from "@/components/game/steam-reviews-carousel"
import { cn } from "@/lib/utils"

type ReviewVariant = "standalone" | "embedded"

function reviewsShellClass(variant: ReviewVariant) {
  return cn(
    variant === "standalone" && "border-t border-border/60 px-6 pb-6 pt-5 sm:px-8",
    variant === "embedded" && "min-w-0"
  )
}

export function SteamReviewsSkeleton({ variant = "standalone" }: { variant?: ReviewVariant }) {
  return (
    <div className={reviewsShellClass(variant)}>
      <div className="flex items-stretch gap-2 sm:gap-3">
        <div className="h-auto min-h-[7rem] w-10 shrink-0 animate-pulse rounded-md border border-border bg-muted" />
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="space-y-3 rounded-xl border border-border bg-card/50 p-4 animate-pulse"
            >
              <div className="flex justify-between gap-2">
                <div className="h-4 w-10 rounded bg-muted" />
                <div className="h-3 w-20 rounded bg-muted" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-4/5 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-auto min-h-[7rem] w-10 shrink-0 animate-pulse rounded-md border border-border bg-muted" />
      </div>
    </div>
  )
}

export async function SteamReviews({
  appId,
  variant = "standalone",
}: {
  appId: string
  variant?: ReviewVariant
}) {
  const reviews = await fetchSteamReviews(appId, 10)

  if (reviews === null) {
    return null
  }

  if (reviews.length === 0) {
    return (
      <div className={reviewsShellClass(variant)}>
        <p className="text-center text-sm text-muted-foreground md:text-left">
          한국어 리뷰가 없습니다.
        </p>
      </div>
    )
  }

  return (
    <div className={reviewsShellClass(variant)}>
      <SteamReviewsCarousel reviews={reviews} />
    </div>
  )
}
