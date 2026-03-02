"use client"

import { useState, useEffect, useMemo } from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { fetchGames } from "@/lib/data"
import type { GameRow } from "@/lib/data"
import type { CustomEventItem } from "@/contexts/custom-events-context"

interface AddCustomEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (event: Omit<CustomEventItem, "id">) => void
  onUpdate?: (id: string, event: Omit<CustomEventItem, "id">) => void
  initialEvent?: CustomEventItem | null
}

export function AddCustomEventDialog({ open, onOpenChange, onAdd, onUpdate, initialEvent }: AddCustomEventDialogProps) {
  const isEdit = !!initialEvent
  const [title, setTitle] = useState("")
  const [date, setDate] = useState<Date | null>(null)
  const [gameSearch, setGameSearch] = useState("")
  const [selectedGame, setSelectedGame] = useState<GameRow | null>(null)
  const [freeGameText, setFreeGameText] = useState("")
  const [description, setDescription] = useState("")
  const [games, setGames] = useState<GameRow[]>([])
  const [gamesLoading, setGamesLoading] = useState(false)
  const [gamePopoverOpen, setGamePopoverOpen] = useState(false)
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)

  useEffect(() => {
    if (open) {
      setGamesLoading(true)
      fetchGames()
        .then(setGames)
        .finally(() => setGamesLoading(false))
      setDatePopoverOpen(false)
      setGamePopoverOpen(false)
      if (initialEvent) {
        setTitle(initialEvent.title)
        setDate(new Date(initialEvent.start_date))
        setGameSearch("")
        setSelectedGame(null)
        setFreeGameText(initialEvent.game_title ?? "")
        setDescription(initialEvent.description ?? "")
      } else {
        setTitle("")
        setDate(null)
        setGameSearch("")
        setSelectedGame(null)
        setFreeGameText("")
        setDescription("")
      }
    }
  }, [open, initialEvent])

  const filteredGames = useMemo(() => {
    if (!gameSearch.trim()) return games.slice(0, 20)
    const q = gameSearch.trim().toLowerCase()
    return games
      .filter(
        (g) =>
          (g.title?.toLowerCase().includes(q)) ||
          (g.korean_title?.toLowerCase().includes(q))
      )
      .slice(0, 20)
  }, [games, gameSearch])

  const gameDisplayValue = selectedGame
    ? (selectedGame.korean_title || selectedGame.title) ?? ""
    : freeGameText

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date) return
    const gameTitle = selectedGame
      ? (selectedGame.korean_title || selectedGame.title) ?? ""
      : (freeGameText.trim() || null)
    const gameId = selectedGame?.id ?? null
    const gameCover = selectedGame?.cover_image_url ?? null
    const gameHeader = selectedGame?.header_image_url ?? null
    const payload = {
      title: title.trim(),
      start_date: date.toISOString(),
      description: description.trim() || null,
      game_id: gameId,
      game_title: gameTitle,
      game_cover_url: gameCover,
      game_header_url: gameHeader,
    }
    if (isEdit && initialEvent && onUpdate) {
      onUpdate(initialEvent.id, payload)
    } else {
      onAdd(payload)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle>{isEdit ? "일정 수정" : "일정 추가"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="gap-2">
            <Label htmlFor="title">일정 이름 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 패치 데이"
              required
            />
          </div>

          <div className="gap-2">
            <Label>일정 날짜 *</Label>
            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: ko }) : "날짜 선택"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date ?? undefined}
                  onSelect={(d) => {
                    setDate(d ?? null)
                    setDatePopoverOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="gap-2">
            <Label htmlFor="game">게임 (선택)</Label>
            <Popover open={gamePopoverOpen} onOpenChange={setGamePopoverOpen}>
              <div className="flex gap-2">
                <PopoverAnchor asChild>
                  <div className="flex-1">
                    <Input
                      id="game"
                      placeholder="검색하거나 직접 입력"
                      value={gameDisplayValue}
                      onChange={(e) => {
                        const v = e.target.value
                        setGameSearch(v)
                        setSelectedGame(null)
                        setFreeGameText(v)
                        setGamePopoverOpen(v.trim().length >= 1)
                      }}
                    />
                  </div>
                </PopoverAnchor>
                {gameDisplayValue && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedGame(null)
                      setFreeGameText("")
                      setGameSearch("")
                      setGamePopoverOpen(false)
                    }}
                  >
                    지우기
                  </Button>
                )}
              </div>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <ScrollArea className="max-h-48">
                  <div className="p-1">
                    {gamesLoading ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">로딩 중...</p>
                    ) : filteredGames.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        검색 결과 없음 (위에 직접 입력 가능)
                      </p>
                    ) : (
                      filteredGames.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          className="flex w-full cursor-pointer items-center rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            setSelectedGame(g)
                            setFreeGameText("")
                            setGameSearch("")
                            setGamePopoverOpen(false)
                          }}
                        >
                          {g.korean_title || g.title}
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>

          <div className="gap-2">
            <Label htmlFor="description">상세 설명 (선택)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="추가 설명"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={!title.trim() || !date}>
              {isEdit ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
