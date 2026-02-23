"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

/* ═══════════════════════════════════════════════════════════════
   Local Storage Key (게임/태그 팔로우와 동일한 방식)
   추후 계정 로그인 시 서버 동기화 예정
   ═══════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "driflux_calendar_settings"

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

export type EventCategory = "competition" | "patch" | "discount" | "collaboration"

export interface CalendarSettings {
  categories: Record<EventCategory, boolean>
  showPast: boolean
  /** null = 전체 선택, [] = 전체 해제, string[] = 선택된 external_url */
  esportsChannelsChecked: string[] | null
}

const DEFAULT_SETTINGS: CalendarSettings = {
  categories: {
    competition: true,
    patch: true,
    discount: true,
    collaboration: true,
  },
  showPast: false,
  esportsChannelsChecked: null,
}

interface CalendarSettingsContextType extends CalendarSettings {
  isInitialized: boolean
  setCategoryChecked: (cat: EventCategory, checked: boolean) => void
  setShowPast: (value: boolean) => void
  setEsportsChannelsChecked: (value: Set<string> | null) => void
}

/* ═══════════════════════════════════════════════════════════════
   Context
   ═══════════════════════════════════════════════════════════════ */

const CalendarSettingsContext = createContext<CalendarSettingsContextType | undefined>(undefined)

/* ═══════════════════════════════════════════════════════════════
   Helpers (favorites-context와 동일 패턴)
   ═══════════════════════════════════════════════════════════════ */

function getStoredSettings(): CalendarSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === null) return DEFAULT_SETTINGS
    const parsed = JSON.parse(stored) as Partial<CalendarSettings>
    return {
      categories: { ...DEFAULT_SETTINGS.categories, ...parsed.categories },
      showPast: parsed.showPast ?? DEFAULT_SETTINGS.showPast,
      esportsChannelsChecked: parsed.esportsChannelsChecked ?? DEFAULT_SETTINGS.esportsChannelsChecked,
    }
  } catch (error) {
    console.error("Error reading calendar settings from localStorage:", error)
    return DEFAULT_SETTINGS
  }
}

function setStoredSettings(value: CalendarSettings): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    window.dispatchEvent(
      new CustomEvent("localStorageChange", { detail: { key: STORAGE_KEY, value } })
    )
  } catch (error) {
    console.error("Error writing calendar settings to localStorage:", error)
  }
}

/* ═══════════════════════════════════════════════════════════════
   Provider
   ═══════════════════════════════════════════════════════════════ */

export function CalendarSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CalendarSettings>(DEFAULT_SETTINGS)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    setSettings(getStoredSettings())
    setInitialized(true)
  }, [])

  useEffect(() => {
    if (initialized) {
      setStoredSettings(settings)
    }
  }, [settings, initialized])

  const setCategoryChecked = (cat: EventCategory, checked: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, categories: { ...prev.categories, [cat]: checked } }
      if (cat === "competition") {
        next.esportsChannelsChecked = checked ? null : []
      }
      return next
    })
  }

  const setShowPast = (value: boolean) => {
    setSettings((prev) => ({ ...prev, showPast: value }))
  }

  const setEsportsChannelsChecked = (value: Set<string> | null) => {
    setSettings((prev) => ({
      ...prev,
      esportsChannelsChecked: value === null ? null : Array.from(value),
    }))
  }

  const value: CalendarSettingsContextType = {
    ...settings,
    isInitialized: initialized,
    setCategoryChecked,
    setShowPast,
    setEsportsChannelsChecked,
  }

  return (
    <CalendarSettingsContext.Provider value={value}>
      {children}
    </CalendarSettingsContext.Provider>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Hook
   ═══════════════════════════════════════════════════════════════ */

export function useCalendarSettings(): CalendarSettingsContextType {
  const context = useContext(CalendarSettingsContext)
  if (context === undefined) {
    throw new Error("useCalendarSettings must be used within a CalendarSettingsProvider")
  }
  return context
}
