import { Suspense } from "react"
import { GameEvaluationScores } from "@/components/game/game-evaluation-scores"
import { SteamReviews, SteamReviewsSkeleton } from "@/components/game/steam-reviews"
import type { GameRow } from "@/lib/data"
import {
  gameHasEvaluationScores,
  gameShowsEvaluationsSection,
} from "@/lib/game-evaluations"

export function GameEvaluations({ game }: { game: GameRow }) {
  if (!gameShowsEvaluationsSection(game)) {
    return null
  }

  const hasScores = gameHasEvaluationScores(game)
  const hasSteamReviews = game.steam_appid != null
  const twoCol = hasScores && hasSteamReviews

  return (
    <section
      className="mx-4 mt-4 lg:mx-6"
      aria-label="게임 평가 및 사용자 리뷰"
    >
      <div
        className={
          twoCol
            ? "grid gap-8 md:grid-cols-2 md:items-start md:gap-12"
            : "flex flex-col gap-4"
        }
      >
        {hasScores ? (
          <div className="flex min-w-0 flex-col">
            <GameEvaluationScores game={game} />
          </div>
        ) : null}
        {hasSteamReviews ? (
          <div className="flex min-w-0 flex-col">
            <Suspense fallback={<SteamReviewsSkeleton variant="embedded" />}>
              <SteamReviews appId={String(game.steam_appid)} variant="embedded" />
            </Suspense>
          </div>
        ) : null}
      </div>
    </section>
  )
}
