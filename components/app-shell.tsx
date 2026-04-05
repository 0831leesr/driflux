"use client"

import { useState, FormEvent, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import Link from "next/link"
import { Search, Menu, PanelLeftClose, PanelLeftOpen, Info } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { LeftSidebar } from "@/components/left-sidebar"
import { Footer } from "@/components/footer"
import { MainTabNavShell } from "@/components/main-tab-nav"

interface AppShellProps {
  children: React.ReactNode
  /** Server-rendered auth slot (Login / account menu). */
  headerAuth: React.ReactNode
}

export function AppShell({ children, headerAuth }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { resolvedTheme } = useTheme()
  const logoMiniSrc = resolvedTheme === "light" ? "/logo_mini_light.png" : "/logo_mini_dark.png"
  const logoTextSrc = resolvedTheme === "light" ? "/logo_light.png" : "/logo_dark.png"

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

  const showMainTabs = pathname === "/" || pathname.startsWith("/explore")

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
            aria-label="메뉴 열기"
          >
            <Menu className="h-5 w-5" />
          </Button>
          {/* Desktop sidebar collapse button - visible on lg+ */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden -ml-2 lg:flex h-8 w-8"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            aria-label={sidebarCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            <Link href="/" className="flex h-8 shrink-0 items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoMiniSrc}
                alt=""
                className="h-8 w-auto object-contain"
                fetchPriority="high"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoTextSrc}
                alt="Richzem"
                className="h-5 w-auto object-contain"
                fetchPriority="high"
              />
            </Link>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <Link href="/about-richzem" aria-label="리치젬에 관하여" title="리치젬에 관하여">
                <Info className="h-4 w-4" strokeWidth={2} />
              </Link>
            </Button>
          </div>
          </div>

          <form onSubmit={handleSearch} className="mx-4 hidden max-w-xl flex-1 md:flex">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="게임, 스트리머, 태그 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full border-border bg-secondary pl-9 text-foreground placeholder:text-muted-foreground focus-visible:ring-[hsl(var(--neon-purple))]"
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
            <ModeToggle />
            {headerAuth}
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
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] transition-[margin] duration-300 ease-in-out">
          <main className="flex min-h-full min-w-0 flex-1 flex-col">
            {showMainTabs ? <MainTabNavShell /> : null}
            {children}
            <Footer />
          </main>
        </div>
      </div>
    </div>
  )
}
