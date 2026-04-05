"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

/** 헤더 좌상단과 동일한 테마 연동 로고(미니 + 텍스트) */
export function LoginBrandLogos({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme()
  const logoMiniSrc = resolvedTheme === "light" ? "/logo_mini_light.png" : "/logo_mini_dark.png"
  const logoTextSrc = resolvedTheme === "light" ? "/logo_light.png" : "/logo_dark.png"

  return (
    <div className={cn("mb-6 flex justify-center", className)}>
      <Link href="/" className="flex h-8 items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoMiniSrc}
          alt=""
          className="h-8 w-auto object-contain"
          fetchPriority="high"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoTextSrc} alt="Richzem" className="h-5 w-auto object-contain" fetchPriority="high" />
      </Link>
    </div>
  )
}
