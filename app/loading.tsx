import { Flame } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { GameCardGridSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <>
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border/50 bg-card/80 backdrop-blur-xl px-4 lg:px-6">
        <div className="flex h-10 gap-4">
          <div className="relative border-b-2 border-[hsl(var(--neon-purple))] px-4 py-2.5">
            <span className="text-sm font-medium">메인</span>
          </div>
          <div className="relative px-4 py-2.5">
            <span className="text-sm font-medium text-muted-foreground">팔로우</span>
          </div>
          <div className="relative px-4 py-2.5">
            <span className="text-sm font-medium text-muted-foreground">탐색</span>
          </div>
          <div className="relative px-4 py-2.5">
            <span className="text-sm font-medium text-muted-foreground">캘린더</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-8 p-4 lg:p-6">
          {/* Now Trending Section */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Flame className="h-5 w-5 text-orange-400" />
                Now Trending
              </h2>
              <div className="flex items-center gap-1">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
            <GameCardGridSkeleton count={4} />
          </section>
        </div>
      </main>
    </>
  )
}
