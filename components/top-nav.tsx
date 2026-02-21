"use client"

import { Search, Bell, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TopNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function TopNav({ activeTab, onTabChange }: TopNavProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
      {/* Top Header Row */}
      <div className="flex h-14 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--neon-purple))]">
              <span className="text-sm font-bold text-[hsl(var(--primary-foreground))]">
                D
              </span>
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Driflux
            </span>
          </div>
        </div>

        <div className="mx-4 hidden max-w-xl flex-1 md:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search games, streamers, tags..."
              className="h-9 w-full border-border bg-secondary pl-9 text-foreground placeholder:text-muted-foreground focus-visible:ring-[hsl(var(--neon-purple))]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:text-foreground"
            aria-label="Game Alerts"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[hsl(var(--neon-green))]" />
          </Button>
          <Button
            size="sm"
            className="bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--neon-purple))]/80"
          >
            <LogIn className="mr-1.5 h-4 w-4" />
            Login
          </Button>
        </div>
      </div>

    </header>
  )
}

export function TabNav({
  activeTab,
  onTabChange,
}: { activeTab: string; onTabChange: (tab: string) => void }) {
  return (
    <div className="flex items-center gap-2 border-b border-border/50 bg-card/80 backdrop-blur-xl px-4 lg:px-6">
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="h-10 bg-transparent p-0">
          <TabsTrigger
            value="main"
            className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-[hsl(var(--neon-purple))] data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            Main
          </TabsTrigger>
          <TabsTrigger
            value="explore"
            className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-[hsl(var(--neon-purple))] data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            Game Explore
          </TabsTrigger>
          <TabsTrigger
            value="calendar"
            className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-[hsl(var(--neon-purple))] data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            Calendar
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}
