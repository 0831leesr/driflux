import { Skeleton } from "@/components/ui/skeleton"
import { StreamCardSkeleton } from "@/components/skeletons"

export default function GamePageLoading() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col">
        {/* Hero Section */}
        <section className="relative">
          <Skeleton className="h-[400px] w-full" />
          
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/90 to-transparent p-6">
            <div className="mx-auto flex max-w-7xl items-end gap-6">
              <Skeleton className="h-48 w-36 shrink-0" />
              <div className="flex-1 pb-4">
                <Skeleton className="mb-3 h-10 w-2/3" />
                <div className="mb-4 flex flex-wrap gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-20" />
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-10" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="bg-background p-6">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Main Content */}
              <div className="lg:col-span-2">
                <Skeleton className="mb-4 h-7 w-32" />
                <Skeleton className="mb-2 h-5 w-full" />
                <Skeleton className="mb-2 h-5 w-full" />
                <Skeleton className="mb-6 h-5 w-3/4" />

                <div className="mb-8">
                  <Skeleton className="mb-4 h-7 w-40" />
                  <div className="card-grid-4-wrapper -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="card-grid-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <StreamCardSkeleton key={i} />
                    ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
