import { Flame, Gamepad2, Hash } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { StreamCardSkeleton, GameCardGridSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <>
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border/50 bg-card/80 backdrop-blur-xl px-4 lg:px-6">
        <div className="flex h-10 gap-4">
          <div className="relative border-b-2 border-[hsl(var(--neon-purple))] px-4 py-2.5">
            <span className="text-sm font-medium">Main</span>
          </div>
          <div className="relative px-4 py-2.5">
            <span className="text-sm font-medium text-muted-foreground">Game Explore</span>
          </div>
          <div className="relative px-4 py-2.5">
            <span className="text-sm font-medium text-muted-foreground">Calendar</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-8 p-4 lg:p-6">
          {/* Trending Games Section */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Flame className="h-5 w-5 text-orange-400" />
                Now Trending (Don't Miss Out)
              </h2>
              <div className="flex items-center gap-1">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="min-w-[320px] shrink-0 overflow-hidden rounded-xl border border-border bg-card"
                >
                  <Skeleton className="aspect-[16/9] w-full" />
                </div>
              ))}
            </div>
          </section>

          {/* Live: My Followed Games */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Gamepad2 className="h-5 w-5 text-[hsl(var(--neon-purple))]" />
                Live: My Followed Games
              </h2>
              <Skeleton className="h-9 w-24" />
            </div>
            <div className="card-grid-4-wrapper -mx-4 px-4 lg:-mx-6 lg:px-6">
              <div className="card-grid-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <StreamCardSkeleton key={i} />
              ))}
              </div>
            </div>
          </section>

          {/* Tag Match Section */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Hash className="h-5 w-5 text-[hsl(var(--neon-green))]" />
                Tag Match: Because you like #Horror
              </h2>
              <Skeleton className="h-9 w-24" />
            </div>
            <div className="card-grid-4-wrapper -mx-4 px-4 lg:-mx-6 lg:px-6">
              <div className="card-grid-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <StreamCardSkeleton key={i} />
              ))}
              </div>
            </div>
          </section>

          {/* Sale Alert Section */}
          <section>
            <div className="mb-4">
              <Skeleton className="mb-2 h-8 w-64" />
              <Skeleton className="h-5 w-96" />
            </div>
            <div className="card-grid-4-wrapper -mx-4 px-4 lg:-mx-6 lg:px-6">
              <div className="card-grid-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
                  <Skeleton className="aspect-[16/9] w-full" />
                  <div className="p-3">
                    <Skeleton className="mb-2 h-5 w-3/4" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
