"use client"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Bell } from "lucide-react"
import { cn } from "@/lib/utils"

const DUMMY_NOTIFICATIONS = [
  { id: "1", message: "Welcome to Driflux!", unread: true },
  { id: "2", message: "Data updated successfully.", unread: true },
  { id: "3", message: "New features added.", unread: true },
]

export function NotificationCenter() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-purple))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[hsl(var(--neon-green))]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 border-border bg-popover text-popover-foreground"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            Notifications
          </h3>
        </div>

        {/* List */}
        <div className="max-h-[280px] overflow-y-auto">
          {DUMMY_NOTIFICATIONS.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-secondary/50",
                item.unread && "bg-secondary/30"
              )}
            >
              {/* Unread indicator (blue dot) */}
              <span
                className={cn(
                  "mt-2 h-2 w-2 shrink-0 rounded-full",
                  item.unread ? "bg-blue-500" : "bg-transparent"
                )}
                aria-hidden
              />
              <p className="flex-1 text-sm text-foreground">{item.message}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            Mark all as read
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
