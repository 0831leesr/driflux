import Link from "next/link"
import { cn } from "@/lib/utils"

/** 헤더 좌상단과 동일한 테마 연동 로고(미니 + 텍스트) */
export function LoginBrandLogos({ className }: { className?: string }) {
  return (
    <div className={cn("mb-6 flex justify-center", className)}>
      <Link href="/" className="flex h-8 items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo_mini_dark.webp"
          alt=""
          width={32}
          height={32}
          className="h-8 w-auto object-contain dark:block hidden"
          fetchPriority="high"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo_mini_light.webp"
          alt=""
          width={32}
          height={32}
          className="h-8 w-auto object-contain dark:hidden block"
          fetchPriority="high"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo_dark.webp"
          alt="Richzem"
          width={120}
          height={20}
          className="h-5 w-auto object-contain dark:block hidden"
          fetchPriority="high"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo_light.webp"
          alt="Richzem"
          width={120}
          height={20}
          className="h-5 w-auto object-contain dark:hidden block"
          fetchPriority="high"
        />
      </Link>
    </div>
  )
}
