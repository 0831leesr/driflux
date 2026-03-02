"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

const STORAGE_KEY = "driflux_custom_events"

export interface CustomEventItem {
  id: string
  title: string
  start_date: string
  description: string | null
  /** DB 게임 매칭 시 id, 없으면 null */
  game_id: number | null
  /** 검색 안 되는 게임은 텍스트로 저장 (표시용) */
  game_title: string | null
  /** 게임 선택 시 커버/헤더 이미지 (표시용) */
  game_cover_url?: string | null
  game_header_url?: string | null
}

interface CustomEventsContextType {
  events: CustomEventItem[]
  isInitialized: boolean
  addEvent: (event: Omit<CustomEventItem, "id">) => void
  updateEvent: (id: string, event: Omit<CustomEventItem, "id">) => void
  removeEvent: (id: string) => void
}

const CustomEventsContext = createContext<CustomEventsContextType | undefined>(undefined)

function getStoredEvents(): CustomEventItem[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === null) return []
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error("Error reading custom events from localStorage:", error)
    return []
  }
}

function setStoredEvents(value: CustomEventItem[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    window.dispatchEvent(
      new CustomEvent("localStorageChange", { detail: { key: STORAGE_KEY, value } })
    )
  } catch (error) {
    console.error("Error writing custom events to localStorage:", error)
  }
}

function generateId(): string {
  return `custom-${crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)}`
}

export function CustomEventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<CustomEventItem[]>([])
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    setEvents(getStoredEvents())
    setInitialized(true)
  }, [])

  useEffect(() => {
    if (initialized) setStoredEvents(events)
  }, [events, initialized])

  const addEvent = (event: Omit<CustomEventItem, "id">) => {
    setEvents((prev) => [...prev, { ...event, id: generateId() }])
  }

  const updateEvent = (id: string, event: Omit<CustomEventItem, "id">) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...event, id } : e))
    )
  }

  const removeEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <CustomEventsContext.Provider value={{ events, isInitialized: initialized, addEvent, updateEvent, removeEvent }}>
      {children}
    </CustomEventsContext.Provider>
  )
}

export function useCustomEvents(): CustomEventsContextType {
  const context = useContext(CustomEventsContext)
  if (context === undefined) {
    throw new Error("useCustomEvents must be used within a CustomEventsProvider")
  }
  return context
}
