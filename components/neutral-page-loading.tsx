import { Skeleton } from "@/components/ui/skeleton"

/**
 * 홈·탐색 페이지 본문 로딩 — 상단 메인 탭은 AppShell에 고정되어 여기서는 그리지 않습니다.
 */
export function NeutralPageLoading() {
  return (
    <div className="w-full min-w-0 px-4 py-6 lg:px-6">
      <Skeleton className="mb-6 h-8 w-[min(100%,18rem)] max-w-full rounded-md" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}
