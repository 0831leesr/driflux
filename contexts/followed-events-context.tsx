"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

const STORAGE_KEY = "richzem_followed_events"

export interface FollowedEventData {
  id: string
  title: string
  /** ISO date string (start date) */
  date: string
  /** ISO date string (end date) or null */
  endDate: string | null
  category: string
  subtitle?: string | null
}

/** upcoming_followed_events 뷰에서 반환되는 행 형식 */
interface SupabaseFollowedEventRow {
  event_id: number
  title: string
  start_date: string
  end_date: string | null
  event_type: string | null
  game_title?: string | null
}

interface FollowedEventsContextType {
  followedEvents: FollowedEventData[]
  isFollowed: (id: string) => boolean
  followEvent: (event: FollowedEventData) => void
  unfollowEvent: (id: string) => void
  toggleFollow: (event: FollowedEventData) => void
}

const FollowedEventsContext = createContext<FollowedEventsContextType | undefined>(undefined)

function getStored(): FollowedEventData[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored) as FollowedEventData[]
  } catch {
    return []
  }
}

function rowToFollowedEventData(row: SupabaseFollowedEventRow): FollowedEventData {
  return {
    id: String(row.event_id),
    title: row.title,
    date: row.start_date,
    endDate: row.end_date ?? null,
    category: row.event_type ?? "competition",
    subtitle: row.game_title ?? null,
  }
}

export function FollowedEventsProvider({ children }: { children: ReactNode }) {
  const [followedEvents, setFollowedEvents] = useState<FollowedEventData[]>([])
  const [initialized, setInitialized] = useState(false)

  /* localStorage 초기화 */
  useEffect(() => {
    setFollowedEvents(getStored())
    setInitialized(true)
  }, [])

  /* localStorage 동기화 */
  useEffect(() => {
    if (!initialized) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(followedEvents))
    } catch {
      // ignore
    }
  }, [followedEvents, initialized])

  /* Supabase 동기화: 로그인한 유저의 서버 데이터를 우선 적용 */
  useEffect(() => {
    if (!initialized) return

    async function syncFromSupabase() {
      try {
        const res = await fetch("/api/calendar/followed-events")
        if (!res.ok) return
        const rows = (await res.json()) as SupabaseFollowedEventRow[]

        // 서버 이벤트가 없으면 (비로그인 포함) localStorage 유지
        if (!Array.isArray(rows) || rows.length === 0) return

        const serverEvents = rows.map(rowToFollowedEventData)

        setFollowedEvents((prev) => {
          // UUID ID(커스텀 이벤트)는 로컬에만 존재 — 보존
          const customOnly = prev.filter((e) => isNaN(parseInt(e.id)))
          const merged = [...serverEvents, ...customOnly]
          const seen = new Set<string>()
          return merged.filter((e) => {
            if (seen.has(e.id)) return false
            seen.add(e.id)
            return true
          })
        })
      } catch {
        // Supabase fetch 실패 시 localStorage 유지
      }
    }

    syncFromSupabase()
    // 마운트 시 1회만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized])

  const isFollowed = (id: string) => followedEvents.some((e) => e.id === id)

  const followEvent = (event: FollowedEventData) => {
    setFollowedEvents((prev) => {
      if (prev.some((e) => e.id === event.id)) return prev
      return [...prev, event]
    })
  }

  const unfollowEvent = (id: string) => {
    setFollowedEvents((prev) => prev.filter((e) => e.id !== id))
  }

  const toggleFollow = (event: FollowedEventData) => {
    setFollowedEvents((prev) => {
      if (prev.some((e) => e.id === event.id)) {
        return prev.filter((e) => e.id !== event.id)
      }
      return [...prev, event]
    })
  }

  return (
    <FollowedEventsContext.Provider
      value={{ followedEvents, isFollowed, followEvent, unfollowEvent, toggleFollow }}
    >
      {children}
    </FollowedEventsContext.Provider>
  )
}

export function useFollowedEvents(): FollowedEventsContextType {
  const context = useContext(FollowedEventsContext)
  if (!context) throw new Error("useFollowedEvents must be used within FollowedEventsProvider")
  return context
}
