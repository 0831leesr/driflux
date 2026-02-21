import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Eye } from "lucide-react"
import { formatViewerCountShort, getGameImageSrc, isPlaceholderImage } from "@/lib/utils"

export interface StreamData {
  id: number
  thumbnail: string
  gameCover: string
  gameTitle: string
  streamTitle: string
  streamerName: string
  viewers: number // Raw viewer count
  viewersFormatted?: string // Pre-formatted (optional)
  isLive?: boolean
  saleDiscount?: string
  gameId?: number
  /** Chzzk channel ID for external link: https://chzzk.naver.com/live/{channelId} */
  channelId?: string | null
  /** Direct URL (if provided, takes precedence over channelId) */
  url?: string | null
  rawData?: {
    streamCategory: string | null
    gameData: any
  }
}

export function StreamCard({ stream, onStreamClick }: { stream: StreamData; onStreamClick?: (stream: StreamData) => void }) {
  // Use thumbnail first, fallback to game cover, then placeholder
  const gameCoverSrc = getGameImageSrc(stream.gameCover, "cover")
  const displayImage = stream.thumbnail || gameCoverSrc
  const viewerDisplay = stream.viewersFormatted || formatViewerCountShort(stream.viewers)
  const isLive = stream.isLive !== false // Default to true if not specified

  const handleStreamClick = (e: React.MouseEvent) => {
    // Check if click was on game-related elements
    const target = e.target as HTMLElement
    if (target.closest('.game-link')) {
      e.stopPropagation()
      return
    }
    onStreamClick?.(stream)
  }

  return (
    <article
      className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-[hsl(var(--neon-purple))]/40 hover:shadow-lg hover:shadow-[hsl(var(--neon-purple))]/5"
      onClick={handleStreamClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onStreamClick?.(stream) }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden">
        <Image
          src={displayImage}
          alt={`${stream.streamerName} streaming ${stream.gameTitle}`}
          fill
          placeholder="empty"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(min-width: 872px) 25vw, 200px"
          unoptimized={isPlaceholderImage(displayImage)}
        />

        {/* Live indicator with viewer count */}
        {isLive && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-[hsl(var(--live-red))] px-2 py-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            <span className="text-[11px] font-bold text-white uppercase tracking-wide">
              LIVE
            </span>
          </div>
        )}

        {/* Viewer count badge */}
        {stream.viewers > 0 && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 backdrop-blur-sm">
            <Eye className="h-3 w-3 text-white" />
            <span className="text-[11px] font-semibold text-white">
              {viewerDisplay}
            </span>
          </div>
        )}

        {/* Game cover overlay - clickable to game details */}
        {stream.gameId ? (
          <Link 
            href={`/game/${stream.gameId}`}
            className="game-link absolute -bottom-3 left-3 h-14 w-10 overflow-hidden rounded-md border-2 border-card shadow-lg transition-transform hover:scale-105 hover:border-[hsl(var(--neon-purple))]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={gameCoverSrc}
              alt={stream.gameTitle}
              fill
              placeholder="empty"
              className="object-cover"
              sizes="40px"
              unoptimized={isPlaceholderImage(gameCoverSrc)}
            />
          </Link>
        ) : (
          <div className="absolute -bottom-3 left-3 h-14 w-10 overflow-hidden rounded-md border-2 border-card shadow-lg">
            <Image
              src={gameCoverSrc}
              alt={stream.gameTitle}
              fill
              placeholder="empty"
              className="object-cover"
              sizes="40px"
              unoptimized={isPlaceholderImage(gameCoverSrc)}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 pb-3 pt-5">
        <div className="mb-0.5 flex items-baseline gap-1.5">
          {stream.gameId ? (
            <Link
              href={`/game/${stream.gameId}`}
              className="game-link truncate text-base font-bold text-foreground hover:text-[hsl(var(--neon-purple))] transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {stream.gameTitle}
            </Link>
          ) : (
            <h3 className="truncate text-base font-bold text-foreground">
              {stream.gameTitle}
            </h3>
          )}
          <span className="shrink-0 text-xs text-muted-foreground">
            {stream.streamerName}
          </span>
        </div>
        <p className="mb-2 truncate text-sm leading-snug text-secondary-foreground/70">
          {stream.streamTitle}
        </p>

        {/* Data Badges */}
        {stream.saleDiscount && (
          <div className="flex flex-wrap gap-1">
            <Badge className="border-transparent bg-amber-500/15 px-1.5 py-0 text-[10px] font-medium text-amber-400">
              {stream.saleDiscount}
            </Badge>
          </div>
        )}
      </div>
    </article>
  )
}
