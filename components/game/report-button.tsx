"use client"

import { useState, useEffect, useTransition } from "react"
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { submitErrorReport, type ReportFields } from "@/app/actions/report"

const STORAGE_KEY = "reported_games"

const REPORT_OPTIONS: { id: keyof ReportFields; label: string }[] = [
  { id: "image", label: "이미지 오류" },
  { id: "title", label: "제목 오류" },
  { id: "price", label: "가격 오류" },
  { id: "link", label: "링크 오류" },
]

interface ReportButtonProps {
  gameId: string
}

export function ReportButton({ gameId }: ReportButtonProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [alreadyReported, setAlreadyReported] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const [fields, setFields] = useState<ReportFields & { other: boolean }>({
    image: false,
    title: false,
    price: false,
    link: false,
    other: false,
  })

  // 로컬스토리지에서 이미 신고한 게임인지 확인
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const reported: string[] = stored ? JSON.parse(stored) : []
      if (reported.includes(gameId)) {
        setAlreadyReported(true)
      }
    } catch {
      // 로컬스토리지 접근 불가 시 무시
    }
  }, [gameId])

  const hasAnyChecked = Object.values(fields).some(Boolean)

  function handleToggle(id: keyof typeof fields) {
    setFields((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      // 모달 닫을 때 상태 초기화
      setFields({ image: false, title: false, price: false, link: false, other: false })
      setSubmitError(null)
      setSubmitSuccess(false)
    }
    setOpen(value)
  }

  function handleSubmit() {
    setSubmitError(null)
    startTransition(async () => {
      try {
        const { image, title, price, link } = fields
        await submitErrorReport(gameId, { image, title, price, link })

        // 로컬스토리지에 신고 완료 기록
        try {
          const stored = localStorage.getItem(STORAGE_KEY)
          const reported: string[] = stored ? JSON.parse(stored) : []
          if (!reported.includes(gameId)) {
            reported.push(gameId)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(reported))
          }
        } catch {
          // 로컬스토리지 접근 불가 시 무시
        }

        setSubmitSuccess(true)
        setAlreadyReported(true)

        // 1.5초 후 모달 닫기
        setTimeout(() => setOpen(false), 1500)
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.")
      }
    })
  }

  if (alreadyReported) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled
        aria-label="신고 완료됨"
        title="신고 완료됨"
        className="size-8 shrink-0 rounded-md border-border opacity-70"
      >
        <CheckCircle2 className="h-4 w-4 text-muted-foreground" aria-hidden />
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="정보 오류 신고"
          title="정보 오류 신고"
          className="size-8 shrink-0 rounded-md border-destructive/40 bg-transparent text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/40"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden />
        </Button>
      </DialogTrigger>

      <DialogContent className="border-border bg-card text-foreground sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <DialogTitle className="text-foreground">정보 오류 신고</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            잘못된 정보를 선택해주세요. 검토 후 수정됩니다.
          </DialogDescription>
        </DialogHeader>

        {submitSuccess ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="text-center text-sm font-medium text-foreground">
              신고가 접수되었습니다. 감사합니다!
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 py-2">
              {REPORT_OPTIONS.map(({ id, label }) => (
                <div key={id} className="flex items-center gap-3">
                  <Checkbox
                    id={`report-${id}`}
                    checked={fields[id]}
                    onCheckedChange={() => handleToggle(id)}
                    disabled={isPending}
                    className="border-border data-[state=checked]:bg-[hsl(var(--neon-purple))] data-[state=checked]:border-[hsl(var(--neon-purple))]"
                  />
                  <Label
                    htmlFor={`report-${id}`}
                    className="cursor-pointer text-sm text-foreground"
                  >
                    {label}
                  </Label>
                </div>
              ))}
              {/* '그 외' 항목은 UI 전용 — 서버에는 전송하지 않음 */}
              <div className="flex items-center gap-3">
                <Checkbox
                  id="report-other"
                  checked={fields.other}
                  onCheckedChange={() => handleToggle("other")}
                  disabled={isPending}
                  className="border-border data-[state=checked]:bg-[hsl(var(--neon-purple))] data-[state=checked]:border-[hsl(var(--neon-purple))]"
                />
                <Label
                  htmlFor="report-other"
                  className="cursor-pointer text-sm text-foreground"
                >
                  그 외
                </Label>
              </div>
            </div>

            {submitError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {submitError}
              </p>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
                className="text-muted-foreground hover:text-foreground"
              >
                취소
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!hasAnyChecked || isPending}
                className="bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--neon-purple))]/80 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    접수 중...
                  </>
                ) : (
                  "접수"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
