"use client"

import { Suspense } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const triggerClass =
  "relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-[hsl(var(--neon-purple))] data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"

function homeTabFromSearch(searchParams: URLSearchParams): "main" | "follow" | "calendar" {
  const t = searchParams.get("tab")
  if (t === "follow" || t === "calendar") return t
  return "main"
}

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
    <div className="flex shrink-0 items-center gap-2 border-b border-border/50 bg-card/80 backdrop-blur-xl px-4 lg:px-6">
      <Tabs value={activeTab} onValueChange={handleValueChange} className="w-full">
        <TabsList className="h-10 bg-transparent p-0">
          <TabsTrigger value="main" className={triggerClass}>
            메인
          </TabsTrigger>
          <TabsTrigger value="follow" className={triggerClass}>
            팔로우
          </TabsTrigger>
          <TabsTrigger value="explore" className={triggerClass}>
            탐색
          </TabsTrigger>
          <TabsTrigger value="calendar" className={triggerClass}>
            캘린더
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
          className="h-10 shrink-0 border-b border-border/50 bg-card/80 px-4 backdrop-blur-xl lg:px-6"
          aria-hidden
        />
      }
    >
      <MainTabNav />
    </Suspense>
  )
}
