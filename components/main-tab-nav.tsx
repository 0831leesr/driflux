"use client"

import { useRouter } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface MainTabNavProps {
  activeTab: "main" | "follow" | "explore" | "calendar"
  onTabChange?: (tab: string) => void
}

const triggerClass =
  "relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-[hsl(var(--neon-purple))] data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"

export function MainTabNav({ activeTab, onTabChange }: MainTabNavProps) {
  const router = useRouter()

  const handleValueChange = (val: string) => {
    if (val === "explore") {
      router.push("/explore")
    } else if (activeTab === "explore") {
      router.push(`/?tab=${val}`)
    } else {
      onTabChange?.(val)
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
