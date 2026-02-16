import type { ReactNode } from "react"
import { StreamCard, type StreamData } from "@/components/stream-card"

interface StreamSectionProps {
  title: string
  icon: ReactNode
  streams: StreamData[]
  onStreamClick?: () => void
  emptyMessage?: string
}

export function StreamSection({ title, icon, streams, onStreamClick, emptyMessage }: StreamSectionProps) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
        {icon}
        {title}
      </h2>
      {streams.length === 0 && emptyMessage ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {streams.map((stream, i) => (
            <StreamCard key={`${stream.streamerName}-${i}`} stream={stream} onStreamClick={onStreamClick} />
          ))}
        </div>
      )}
    </section>
  )
}
