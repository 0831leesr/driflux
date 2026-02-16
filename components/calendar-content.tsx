"use client"

import { useState, useMemo, useRef } from "react"
import Image from "next/image"
import {
  Rocket,
  Trophy,
  RefreshCw,
  Bell,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Tag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import type { EventRow } from "@/lib/types"
import { getGameImageSrc } from "@/lib/utils"

/* ── Types ── */
/* DB event_type: 'Competition' | 'Patch' | 'Discount' */
type EventCategory = "competition" | "patch" | "discount"

interface GameEvent {
  id: string
  date: Date
  title: string
  subtitle: string
  description: string
  category: EventCategory
  image: string
  externalUrl?: string
}

const CATEGORY_CONFIG: Record<
  EventCategory,
  { label: string; icon: typeof Trophy; color: string; bgColor: string; barColor: string; checkColor: string }
> = {
  competition: {
    label: "Competition",
    icon: Trophy,
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/15",
    barColor: "bg-indigo-500",
    checkColor: "border-indigo-500 data-[state=checked]:bg-indigo-500 data-[state=checked]:text-white",
  },
  patch: {
    label: "Patch",
    icon: RefreshCw,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/15",
    barColor: "bg-emerald-500",
    checkColor: "border-emerald-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white",
  },
  discount: {
    label: "Discount",
    icon: Tag,
    color: "text-amber-400",
    bgColor: "bg-amber-500/15",
    barColor: "bg-amber-500",
    checkColor: "border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:text-white",
  },
}

function normalizeCategory(eventType: string | null): EventCategory {
  const t = (eventType ?? "").trim()
  const lower = t.toLowerCase()
  if (lower === "competition") return "competition"
  if (lower === "patch") return "patch"
  if (lower === "discount") return "discount"
  /* fallback for legacy/invalid data */
  return "competition"
}

function mapEventsToGameEvents(events: EventRow[]): GameEvent[] {
  return events.map((ev) => {
    const startDate = new Date(ev.start_date)
    const image = getGameImageSrc(
      ev.games?.header_image_url,
      ev.games?.cover_image_url
    )
    return {
      id: String(ev.id),
      date: startDate,
      title: ev.title,
      subtitle: ev.games?.title ?? "",
      description: ev.description ?? "",
      category: normalizeCategory(ev.event_type),
      image,
      externalUrl: ev.external_url ?? undefined,
    }
  })
}

/* ── Helpers ── */
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getDDayText(eventDate: Date, today: Date) {
  const diff = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return "D-Day"
  if (diff > 0) return `D-${diff}`
  return `D+${Math.abs(diff)}`
}

function getWeekLabel(date: Date) {
  const weekNum = Math.ceil(date.getDate() / 7)
  const suffixes = ["st", "nd", "rd", "th", "th"]
  return `${weekNum}${suffixes[weekNum - 1]} Week`
}

/* ── Mini Calendar Component ── */
function MiniCalendar({
  selectedDate,
  onSelect,
  eventDates,
  today,
}: {
  selectedDate: Date | null
  onSelect: (date: Date) => void
  eventDates: Map<string, EventCategory[]>
  today: Date
}) {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const prevMonth = () => setViewMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setViewMonth(new Date(year, month + 1, 1))

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={prevMonth} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold text-foreground">{MONTHS_FULL[month]} {year}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={nextMonth} aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-0">
        {DAYS.map((d) => (
          <div key={d} className="flex h-7 items-center justify-center text-[10px] font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="h-8" />
          const cellDate = new Date(year, month, day)
          const isToday = isSameDay(cellDate, today)
          const isSelected = selectedDate && isSameDay(cellDate, selectedDate)
          const dateKey = `${year}-${month}-${day}`
          const categories = eventDates.get(dateKey)
          return (
            <button
              key={`day-${day}`}
              type="button"
              onClick={() => onSelect(cellDate)}
              className={`relative flex h-8 items-center justify-center rounded-md text-xs transition-colors ${
                isSelected
                  ? "bg-[hsl(var(--neon-purple))] font-bold text-[hsl(var(--primary-foreground))]"
                  : isToday
                    ? "bg-secondary font-semibold text-foreground"
                    : "text-foreground hover:bg-secondary"
              }`}
            >
              {day}
              {categories && categories.length > 0 && (
                <span className="absolute bottom-0.5 flex gap-0.5">
                  {categories.slice(0, 3).map((cat, ci) => (
                    <span key={ci} className={`h-1 w-1 rounded-full ${CATEGORY_CONFIG[cat].barColor}`} />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Hero Highlight Card ── */
function HeroCard({ event, today }: { event: GameEvent; today: Date }) {
  const config = CATEGORY_CONFIG[event.category]
  const dday = getDDayText(event.date, today)
  const isPast = event.date < today
  return (
    <div className={`group relative flex-1 overflow-hidden rounded-xl border border-border ${isPast ? "opacity-50 grayscale" : ""}`}>
      <div className="relative aspect-[16/7]">
        <Image src={event.image} alt={event.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/70 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <span className={`mb-1 text-2xl font-black tracking-tight ${
            dday === "D-Day" ? "text-[hsl(var(--live-red))]" : isPast ? "text-muted-foreground" : "text-[hsl(var(--neon-purple))]"
          }`}>
            {dday}
          </span>
          <h3 className="text-sm font-bold text-foreground lg:text-base">{event.title}</h3>
          <Badge className={`mt-1.5 w-fit border-transparent text-[10px] ${config.bgColor} ${config.color}`}>
            {MONTHS_SHORT[event.date.getMonth()]} {event.date.getDate()}
          </Badge>
        </div>
      </div>
    </div>
  )
}

/* ── Event Card (Timeline Item) ── */
function EventCard({ event, today, remindedIds, onToggleRemind }: {
  event: GameEvent
  today: Date
  remindedIds: Set<string>
  onToggleRemind: (id: string) => void
}) {
  const config = CATEGORY_CONFIG[event.category]
  const Icon = config.icon
  const isPast = event.date < today && !isSameDay(event.date, today)
  const isToday = isSameDay(event.date, today)
  const reminded = remindedIds.has(event.id)

  function handleExternalClick() {
    if (event.externalUrl) {
      window.open(event.externalUrl, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <div className={`group flex gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-[hsl(var(--neon-purple))]/30 ${isPast ? "opacity-50 grayscale" : ""}`}>
      {/* Left: Date */}
      <div className="flex shrink-0 flex-col items-center gap-1">
        <div className={`h-full w-0.5 rounded-full ${config.barColor} ${isPast ? "opacity-30" : ""}`} />
        <span className={`text-2xl font-black ${isToday ? "text-[hsl(var(--neon-purple))]" : "text-foreground"}`}>
          {event.date.getDate()}
        </span>
        <span className="text-[10px] font-medium uppercase text-muted-foreground">
          {MONTHS_SHORT[event.date.getMonth()]} / {DAYS[event.date.getDay()]}
        </span>
        <div className={`mt-1 h-full w-0.5 rounded-full ${config.barColor} ${isPast ? "opacity-30" : ""}`} />
      </div>

      {/* Center: Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Badge className={`w-fit border-transparent text-[10px] font-semibold ${config.bgColor} ${config.color}`}>
          <Icon className="mr-1 h-3 w-3" />
          {config.label}
        </Badge>
        <h4 className="text-sm font-bold text-foreground">{event.title}</h4>
        <p className="text-xs text-muted-foreground">{event.subtitle}</p>
        <p className="text-xs text-muted-foreground/70">{event.description}</p>
      </div>

      {/* Right: Actions */}
      <div className="flex shrink-0 flex-col items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${reminded ? "text-[hsl(var(--neon-purple))]" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => onToggleRemind(event.id)}
          aria-label={reminded ? "Remove reminder" : "Remind me"}
        >
          <Bell className={`h-4 w-4 ${reminded ? "fill-current" : ""}`} />
        </Button>
        {event.externalUrl && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label="View details"
            onClick={handleExternalClick}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

/* ── Main Export ── */
interface CalendarContentProps {
  events: EventRow[]
}

export function CalendarContent({ events }: CalendarContentProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [categories, setCategories] = useState<Record<EventCategory, boolean>>({
    competition: true,
    patch: true,
    discount: true,
  })
  const [showPast, setShowPast] = useState(false)
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set())
  const timelineRef = useRef<HTMLDivElement>(null)

  const gameEvents = useMemo(() => mapEventsToGameEvents(events), [events])

  function toggleCategory(cat: EventCategory) {
    setCategories((prev) => ({ ...prev, [cat]: !prev[cat] }))
  }

  function toggleRemind(id: string) {
    setRemindedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /* Build date->categories map for mini calendar dots (선택된 카테고리만) */
  const eventDates = useMemo(() => {
    const map = new Map<string, EventCategory[]>()
    const filtered = gameEvents.filter((ev) => categories[ev.category])
    for (const ev of filtered) {
      const key = `${ev.date.getFullYear()}-${ev.date.getMonth()}-${ev.date.getDate()}`
      const arr = map.get(key) || []
      arr.push(ev.category)
      map.set(key, arr)
    }
    return map
  }, [gameEvents, categories])

  /* Filter & sort events */
  const filteredEvents = useMemo(() => {
    return gameEvents
      .filter((ev) => categories[ev.category])
      .filter((ev) => {
        if (showPast) return true
        return ev.date >= today || isSameDay(ev.date, today)
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [gameEvents, categories, showPast, today])

  /* Group by month+week */
  const grouped = useMemo(() => {
    const groups: { monthLabel: string; weekLabel: string; events: GameEvent[] }[] = []
    let lastMonthKey = ""
    let lastWeekKey = ""

    for (const ev of filteredEvents) {
      const monthKey = `${ev.date.getFullYear()}-${ev.date.getMonth()}`
      const weekKey = `${monthKey}-w${Math.ceil(ev.date.getDate() / 7)}`
      const monthLabel = `${MONTHS_FULL[ev.date.getMonth()]} ${ev.date.getFullYear()}`
      const weekLabel = getWeekLabel(ev.date)

      if (monthKey !== lastMonthKey || weekKey !== lastWeekKey) {
        groups.push({ monthLabel, weekLabel, events: [ev] })
        lastMonthKey = monthKey
        lastWeekKey = weekKey
      } else {
        groups[groups.length - 1].events.push(ev)
      }
    }
    return groups
  }, [filteredEvents])

  /* Hero highlights: top 3 upcoming (선택된 카테고리만) */
  const heroEvents = useMemo(() => {
    const upcoming = gameEvents
      .filter((ev) => categories[ev.category])
      .filter((ev) => ev.date >= today || isSameDay(ev.date, today))
    return upcoming
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 3)
  }, [gameEvents, categories, today])

  function handleDateSelect(date: Date) {
    setSelectedDate(date)
    /* Scroll to first event on that date */
    if (timelineRef.current) {
      const dateKey = `event-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      const el = timelineRef.current.querySelector(`[data-date-key="${dateKey}"]`)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      {/* Hero Section */}
      {heroEvents.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-foreground">This Month{"'"}s Highlights</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {heroEvents.map((ev) => (
              <HeroCard key={ev.id} event={ev} today={today} />
            ))}
          </div>
        </section>
      )}

      {/* Main Two-Column Layout */}
      <div className="flex gap-6">
        {/* Left Sidebar: Calendar + Filters */}
        <aside className="hidden w-64 shrink-0 flex-col gap-4 lg:flex">
          <div className="sticky top-4 flex flex-col gap-4">
            <MiniCalendar
              selectedDate={selectedDate}
              onSelect={handleDateSelect}
              eventDates={eventDates}
              today={today}
            />

            {/* Category Filters */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Categories
              </h4>
              <div className="flex flex-col gap-3">
                {(Object.keys(CATEGORY_CONFIG) as EventCategory[]).map((cat) => {
                  const config = CATEGORY_CONFIG[cat]
                  const Icon = config.icon
                  return (
                    <label key={cat} className="flex cursor-pointer items-center gap-2.5">
                      <Checkbox
                        checked={categories[cat]}
                        onCheckedChange={() => toggleCategory(cat)}
                        className={config.checkColor}
                      />
                      <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                      <span className="text-sm text-foreground">{config.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Past Events Toggle */}
            <div className="rounded-xl border border-border bg-card p-4">
              <label className="flex cursor-pointer items-center justify-between">
                <span className="text-sm text-foreground">Show Past Events</span>
                <Switch
                  checked={showPast}
                  onCheckedChange={setShowPast}
                  className="data-[state=checked]:bg-[hsl(var(--neon-purple))]"
                />
              </label>
            </div>
          </div>
        </aside>

        {/* Right Content: Agenda Timeline */}
        <div ref={timelineRef} className="flex flex-1 flex-col gap-2">
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-12 text-center">
              <Rocket className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {gameEvents.length === 0
                  ? "예정된 이벤트가 없습니다."
                  : "No upcoming events match your filters."}
              </p>
            </div>
          ) : (
            grouped.map((group, gi) => (
              <div key={gi} className="flex flex-col gap-2">
                {/* Month/Week Header */}
                <div className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 py-2 backdrop-blur-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {group.monthLabel}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {group.weekLabel}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Event Cards */}
                <div className="relative flex flex-col gap-3 pl-3">
                  {/* Timeline Vertical Line */}
                  <div className="absolute bottom-0 left-0 top-0 w-0.5 rounded-full bg-border" />

                  {group.events.map((ev) => (
                    <div
                      key={ev.id}
                      data-date-key={`event-${ev.date.getFullYear()}-${ev.date.getMonth()}-${ev.date.getDate()}`}
                      className="relative"
                    >
                      {/* Timeline Dot */}
                      <div className={`absolute -left-3 top-5 h-2.5 w-2.5 rounded-full border-2 border-background ${CATEGORY_CONFIG[ev.category].barColor}`} />
                      <EventCard
                        event={ev}
                        today={today}
                        remindedIds={remindedIds}
                        onToggleRemind={toggleRemind}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
