import { Skeleton } from "@/components/ui/skeleton"
import { Gamepad2, Tags } from "lucide-react"

/* ═══════════════════════════════════════════════════════════════
   GameCardSkeleton - Loading state for game cards
   ═══════════════════════════════════════════════════════════════ */

export function GameCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Image skeleton */}
      <Skeleton className="aspect-[16/9] w-full" />
      
      {/* Content skeleton */}
      <div className="p-3">
        {/* Title skeleton */}
        <Skeleton className="mb-2 h-5 w-3/4" />
        
        {/* Price skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   GameCardGridSkeleton - Multiple game cards loading
   ═══════════════════════════════════════════════════════════════ */

export function GameCardGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <GameCardSkeleton key={i} />
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   StreamCardSkeleton - Loading state for stream cards
   ═══════════════════════════════════════════════════════════════ */

export function StreamCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Thumbnail skeleton */}
      <Skeleton className="aspect-video w-full" />
      
      {/* Content skeleton */}
      <div className="p-3">
        {/* Stream title */}
        <Skeleton className="mb-2 h-4 w-full" />
        
        {/* Streamer info */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1">
            <Skeleton className="mb-1 h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   SidebarSkeleton - Loading state for sidebar sections
   ═══════════════════════════════════════════════════════════════ */

export function SidebarSkeleton() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card lg:block">
      <div className="flex flex-col gap-6 p-4">
        {/* Followed Games Section */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Gamepad2 className="h-3.5 w-3.5" />
            My Followed Games
          </h3>
          <div className="flex flex-col gap-0.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
                <Skeleton className="h-8 w-6 shrink-0 rounded-sm" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </section>

        {/* Followed Tags Section */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Tags className="h-3.5 w-3.5" />
            My Followed Tags
          </h3>
          <div className="flex flex-col gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
                <Skeleton className="h-6 w-6 shrink-0 rounded-sm" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  )
}

/* ═══════════════════════════════════════════════════════════════
   SidebarItemSkeleton - Single sidebar item loading
   ═══════════════════════════════════════════════════════════════ */

export function SidebarItemSkeleton() {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5">
      <Skeleton className="h-8 w-6 shrink-0 rounded-sm" />
      <Skeleton className="h-4 flex-1" />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PageHeaderSkeleton - Loading state for page headers
   ═══════════════════════════════════════════════════════════════ */

export function PageHeaderSkeleton() {
  return (
    <div className="mb-8">
      <Skeleton className="mb-4 h-10 w-64" />
      <Skeleton className="h-6 w-96" />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   SectionSkeleton - Generic section with title and cards
   ═══════════════════════════════════════════════════════════════ */

export function SectionSkeleton({ 
  cardCount = 4,
  showHeader = true 
}: { 
  cardCount?: number
  showHeader?: boolean 
}) {
  return (
    <section className="mb-12">
      {showHeader && (
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-24" />
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: cardCount }).map((_, i) => (
          <GameCardSkeleton key={i} />
        ))}
      </div>
    </section>
  )
}
