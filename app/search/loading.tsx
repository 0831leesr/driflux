import { Skeleton } from "@/components/ui/skeleton"
import { GameCardSkeleton } from "@/components/skeletons"

export default function SearchLoading() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      {/* Search Header */}
      <div className="flex flex-col gap-4">
        <div>
          <Skeleton className="mb-2 h-8 w-64" />
          <Skeleton className="h-5 w-48" />
        </div>

        {/* Search Bar */}
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center border-b border-border/50 pb-3">
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 15 }).map((_, i) => (
          <GameCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
