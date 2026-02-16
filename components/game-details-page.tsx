"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ExternalLink } from "lucide-react"
import { GameDetailsClient } from "@/components/game-details"
import type { GameRow } from "@/lib/data"
import type { StreamData } from "@/components/stream-card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface GameDetailsPageProps {
  game: GameRow
  streams: StreamData[]
}

export function GameDetailsPage({ game, streams }: GameDetailsPageProps) {
  const router = useRouter()
  const [streamModalOpen, setStreamModalOpen] = useState(false)

  function handleBack() {
    router.back()
  }

  function handleStreamClick() {
    setStreamModalOpen(true)
  }

  return (
    <>
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <GameDetailsClient
          game={game}
          streams={streams}
          onBack={handleBack}
          onStreamClick={handleStreamClick}
        />
      </main>

      {/* Stream Modal */}
      <AlertDialog open={streamModalOpen} onOpenChange={setStreamModalOpen}>
        <AlertDialogContent className="border-border bg-card text-foreground">
          <AlertDialogHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--neon-purple))]/15">
              <ExternalLink className="h-6 w-6 text-[hsl(var(--neon-purple))]" />
            </div>
            <AlertDialogTitle className="text-foreground">
              Watch on External Site?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              You are being redirected to the streaming site (Chzzk). Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-secondary text-foreground hover:bg-secondary/80 hover:text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction className="bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--neon-purple))]/80">
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
