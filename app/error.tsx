"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw, TriangleAlert } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[Error Boundary]", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 sm:h-24 sm:w-24">
          <TriangleAlert className="h-10 w-10 text-destructive sm:h-12 sm:w-12" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            오류가 발생했습니다
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground/60">
              오류 코드: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Button
            onClick={reset}
            size="lg"
            className="bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--neon-purple))]/80"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            다시 시도
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              홈으로 돌아가기
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
