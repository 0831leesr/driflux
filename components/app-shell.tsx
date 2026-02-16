"use client"

import { useState, FormEvent, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import Link from "next/link"
import { Search, Bell, LogIn, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { LeftSidebar } from "@/components/left-sidebar"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { resolvedTheme } = useTheme()
  const logoSrc = resolvedTheme === "light" ? "/logo_light.png" : "/logo_dark.png"

  // Close mobile menu when route changes (e.g. user clicked a link)
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery("")
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2">
          {/* Mobile menu button - visible on < lg */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden -ml-2"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          {/* Desktop sidebar collapse button - visible on lg+ */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden -ml-2 lg:flex h-8 w-8"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
          <Link href="/" className="flex h-8 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt="Driflux"
              className="h-8 w-auto max-w-[120px] object-contain"
              fetchPriority="high"
            />
          </Link>
          </div>

          <form onSubmit={handleSearch} className="mx-4 hidden max-w-xl flex-1 md:flex">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search games, streamers, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full border-border bg-secondary pl-9 text-foreground placeholder:text-muted-foreground focus-visible:ring-[hsl(var(--neon-purple))]"
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
            <ModeToggle />
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

      {/* Mobile Sidebar Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-60 p-0 border-r border-border">
          <LeftSidebar embedded />
        </SheetContent>
      </Sheet>

      {/* Main Layout with Sidebar - 사이드바 고정, 메인 영역만 스크롤 */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <LeftSidebar isCollapsed={sidebarCollapsed} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto transition-[margin] duration-300 ease-in-out">
          {children}
        </div>
      </div>
    </div>
  )
}
