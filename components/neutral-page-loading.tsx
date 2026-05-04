import { Skeleton } from "@/components/ui/skeleton"

function TrendingLikeSectionSkeleton({ cardCount }: { cardCount: number }) {
  return (
    <section className="pb-1">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-7 w-44 shrink-0 rounded-md" aria-hidden />
        <div className="flex gap-1 rounded-lg bg-muted/50 p-1 w-fit" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 min-w-[3.75rem] rounded-md px-2" />
          ))}
        </div>
      </div>
      <div className="card-grid-home-wrapper -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="card-grid-home">
          {Array.from({ length: cardCount }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * 홈·탐색 등 본문 로딩 — 상단 헤더·메인 탭은 AppShell에 고정.
 * 트렌딩·급상승과 유사한 2블록 레이아웃으로 교체 전후 CLS를 줄입니다.
 */
export function NeutralPageLoading() {
  return (
    <div className="w-full min-w-0">
      <div className="flex flex-col gap-8 p-4 sm:gap-10 lg:p-6">
        <div className="flex flex-col gap-8 sm:gap-10">
          <TrendingLikeSectionSkeleton cardCount={8} />
          <TrendingLikeSectionSkeleton cardCount={8} />
        </div>
        <div className="flex flex-col gap-4 pb-8">
          <Skeleton className="h-7 w-36 rounded-md" aria-hidden />
          <div className="card-grid-home-wrapper -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="card-grid-home">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
