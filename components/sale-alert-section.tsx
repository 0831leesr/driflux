import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Users } from "lucide-react"

export interface SaleGameData {
  id: number
  thumbnail: string
  gameCover: string
  gameTitle: string
  streamerName: string
  viewers: string
  discount: string
}

export function SaleAlertSection({ games, onStreamClick }: { games: SaleGameData[]; onStreamClick?: () => void }) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
        <DollarSign className="h-5 w-5 text-amber-400" />
        Wishlist Sale Alert
      </h2>
      <div className="card-grid-4-wrapper -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="card-grid-4">
        {games.map((game) => (
          <Link
            key={game.id}
            href={`/game/${game.id}`}
            className="group flex gap-3 overflow-hidden rounded-lg border border-border bg-card p-2.5 transition-all hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5"
          >
            {/* Compact thumbnail */}
            <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-md">
              <Image
                src={game.thumbnail}
                alt={`${game.streamerName} streaming ${game.gameTitle}`}
                fill
                placeholder="empty"
                className="object-cover"
                sizes="128px"
                unoptimized
              />
              {/* Live badge */}
              <div className="absolute right-1 top-1 flex items-center gap-0.5 rounded bg-[hsl(var(--live-red))] px-1 py-0.5">
                <span className="h-1 w-1 animate-pulse rounded-full bg-[hsl(var(--primary-foreground))]" />
                <span className="text-[9px] font-bold text-[hsl(var(--primary-foreground))]">LIVE</span>
              </div>
            </div>

            {/* Info */}
            <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate text-sm font-bold text-foreground">
                    {game.gameTitle}
                  </h3>
                  <Badge className="shrink-0 border-transparent bg-gradient-to-r from-amber-500 to-red-500 px-2 py-0.5 text-[11px] font-bold text-[hsl(var(--primary-foreground))]">
                    {game.discount}
                  </Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {game.streamerName}
                </p>
              </div>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Users className="h-3 w-3" />
                {game.viewers} watching
              </span>
            </div>
          </Link>
        ))}
        </div>
      </div>
    </section>
  )
}
