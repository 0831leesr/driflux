import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Ghost } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        {/* Icon */}
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--neon-purple))]/15 sm:h-24 sm:w-24">
          <Ghost className="h-10 w-10 text-[hsl(var(--neon-purple))] sm:h-12 sm:w-12" />
        </div>

        {/* Text */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            404
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            찾을 수 없습니다. 요청한 페이지가 존재하지 않습니다.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Button
            asChild
            size="lg"
            className="bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--neon-purple))]/80"
          >
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              홈으로 돌아가기
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/explore">게임 탐색</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
