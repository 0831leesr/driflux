"use client"

import { Suspense } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { CalendarDays, Compass, Heart, LayoutGrid } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

function homeTabFromSearch(searchParams: URLSearchParams): "main" | "follow" | "calendar" {
  const t = searchParams.get("tab")
  if (t === "follow" || t === "calendar") return t
  return "main"
}

const tabTriggerBase =
  "group relative flex flex-1 flex-row items-center justify-center gap-1 rounded-lg border border-transparent px-1.5 py-1 text-sm font-bold leading-none tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-base lg:gap-2 lg:px-3 lg:py-2 lg:text-lg"

const tabIdle =
  "text-muted-foreground hover:border-border/70 hover:bg-background/60 hover:text-foreground hover:shadow-sm"

const tabAccents: Record<
  "main" | "follow" | "explore" | "calendar",
  string
> = {
  main:
    "data-[state=active]:border-[hsl(var(--neon-purple))]/45 data-[state=active]:bg-gradient-to-b data-[state=active]:from-[hsl(var(--neon-purple))]/22 data-[state=active]:to-[hsl(var(--neon-purple))]/8 data-[state=active]:text-foreground data-[state=active]:shadow-[0_6px_20px_-6px_hsl(var(--neon-purple)_/_0.45)] data-[state=active]:[&_svg]:text-[hsl(var(--neon-purple))]",
  follow:
    "data-[state=active]:border-rose-500/45 data-[state=active]:bg-gradient-to-b data-[state=active]:from-rose-500/18 data-[state=active]:to-rose-500/5 data-[state=active]:text-foreground data-[state=active]:shadow-[0_6px_20px_-6px_rgb(244_63_94_/_0.35)] data-[state=active]:[&_svg]:text-rose-500",
  explore:
    "data-[state=active]:border-[hsl(var(--neon-green))]/50 data-[state=active]:bg-gradient-to-b data-[state=active]:from-[hsl(var(--neon-green))]/20 data-[state=active]:to-[hsl(var(--neon-green))]/6 data-[state=active]:text-foreground data-[state=active]:shadow-[0_6px_20px_-6px_hsl(var(--neon-green)_/_0.38)] data-[state=active]:[&_svg]:text-[hsl(var(--neon-green))]",
  calendar:
    "data-[state=active]:border-amber-500/50 data-[state=active]:bg-gradient-to-b data-[state=active]:from-amber-500/18 data-[state=active]:to-amber-500/5 data-[state=active]:text-foreground data-[state=active]:shadow-[0_6px_20px_-6px_rgb(245_158_11_/_0.35)] data-[state=active]:[&_svg]:text-amber-500",
}

const iconClass =
  "h-[1.05rem] w-[1.05rem] shrink-0 opacity-85 transition-opacity group-data-[state=active]:opacity-100 sm:h-[1.15rem] sm:w-[1.15rem] lg:h-5 lg:w-5"

/**
 * `/`, `/explore`에서만 AppShell이 렌더합니다.
 * 선택 상태는 항상 URL(경로 + ?tab=)과 일치하므로 라우트 로딩 중에도 탭 UI가 유지됩니다.
 */
export function MainTabNav() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeTab: "main" | "follow" | "explore" | "calendar" = pathname.startsWith("/explore")
    ? "explore"
    : homeTabFromSearch(searchParams)

  const handleValueChange = (val: string) => {
    if (val === "explore") {
      router.push("/explore")
      return
    }

    if (activeTab === "explore") {
      if (val === "main") router.push("/")
      else if (val === "follow" || val === "calendar") router.push(`/?tab=${val}`)
      return
    }

    if (val === "main") {
      router.replace("/", { scroll: false })
      return
    }
    if (val === "follow" || val === "calendar") {
      router.replace(`/?tab=${val}`, { scroll: false })
    }
  }

  return (
    <div className="flex shrink-0 items-stretch border-b border-border/60 bg-card/90 backdrop-blur-xl px-3 py-1.5 sm:px-4 lg:px-6">
      <Tabs value={activeTab} onValueChange={handleValueChange} className="w-full">
        <TabsList className="flex h-auto min-h-0 w-full items-stretch gap-1 rounded-none border-0 bg-transparent p-0 shadow-none sm:gap-1.5">
          <TabsTrigger
            value="main"
            className={cn(tabTriggerBase, tabIdle, tabAccents.main)}
          >
            <LayoutGrid className={iconClass} aria-hidden />
            <span>메인</span>
          </TabsTrigger>
          <TabsTrigger
            value="follow"
            className={cn(tabTriggerBase, tabIdle, tabAccents.follow)}
          >
            <Heart className={iconClass} aria-hidden />
            <span>팔로우</span>
          </TabsTrigger>
          <TabsTrigger
            value="explore"
            className={cn(tabTriggerBase, tabIdle, tabAccents.explore)}
          >
            <Compass className={iconClass} aria-hidden />
            <span>탐색</span>
          </TabsTrigger>
          <TabsTrigger
            value="calendar"
            className={cn(tabTriggerBase, tabIdle, tabAccents.calendar)}
          >
            <CalendarDays className={iconClass} aria-hidden />
            <span>캘린더</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}

/** useSearchParams 경계 — AppShell에서만 사용 */
export function MainTabNavShell() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-[3.25rem] shrink-0 border-b border-border/60 bg-card/90 px-3 py-1.5 backdrop-blur-xl sm:px-4 lg:px-6"
          aria-hidden
        />
      }
    >
      <MainTabNav />
    </Suspense>
  )
}
