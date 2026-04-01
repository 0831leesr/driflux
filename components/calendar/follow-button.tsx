"use client"

import { useOptimistic, useTransition } from "react"
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toggleFollowEvent } from "@/app/actions/calendar"
import { useFollowedEvents, type FollowedEventData } from "@/contexts/followed-events-context"

interface CalendarFollowButtonProps {
  /** Supabase DB의 숫자형 event_id (서버 액션 호출 시 사용) */
  eventId: number
  /** Context/localStorage에 저장할 팔로우 데이터 */
  eventData: FollowedEventData
}

/**
 * 캘린더 이벤트 팔로우 버튼.
 * - useOptimistic으로 서버 응답 전에 UI 즉시 반영
 * - 로그인 유저: Supabase calendar_follows 테이블 + 로컬 컨텍스트 동시 업데이트
 * - 비로그인 유저: 로컬 컨텍스트(localStorage)만 업데이트
 */
export function CalendarFollowButton({ eventId, eventData }: CalendarFollowButtonProps) {
  const { isFollowed, toggleFollow } = useFollowedEvents()
  const followed = isFollowed(eventData.id)

  const [optimisticFollowed, setOptimisticFollowed] = useOptimistic(followed)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      // 1) 낙관적 UI 반영 (즉시)
      setOptimisticFollowed(!optimisticFollowed)
      // 2) 로컬 컨텍스트 업데이트 (필터 즉시 적용)
      toggleFollow(eventData)
      // 3) 서버 동기화 (로그인 시에만 실제 반영, 비로그인 시 Unauthorized 반환 후 무시)
      await toggleFollowEvent(eventId)
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isPending}
      className={`h-8 w-8 transition-colors ${
        optimisticFollowed
          ? "text-rose-400 hover:text-rose-500"
          : "text-muted-foreground hover:text-rose-400"
      }`}
      aria-label={optimisticFollowed ? "팔로우 취소" : "팔로우"}
      onClick={handleClick}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : optimisticFollowed ? (
        <BookmarkCheck className="h-4 w-4" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
    </Button>
  )
}
