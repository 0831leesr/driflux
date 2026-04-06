"use client"

import type { GameRow } from "@/lib/data"
import { isValidSteamReview, localizeSteamReviewDesc } from "@/lib/game-evaluations"

function SteamScoreGraph({ game }: { game: GameRow }) {
  const pct = game.steam_positive_ratio!
  const desc = game.steam_review_desc ? localizeSteamReviewDesc(game.steam_review_desc) : null
  const clamped = Math.min(100, Math.max(0, pct))

  return (
    <div
      className="w-full min-w-0 overflow-hidden rounded-xl border border-border bg-muted/30 px-3 pb-2.5 pt-3 dark:bg-muted/20"
      role="img"
      aria-label={`스팀 사용자 평가 긍정 비율 ${pct}%`}
    >
      <div className="flex items-start gap-2">
        <span className="shrink-0 pt-0.5 text-left text-sm font-semibold tracking-tight text-foreground">
          스팀
        </span>
        <div className="flex min-w-0 flex-1 flex-col items-end gap-1">
          <div className="flex w-full min-w-0 items-center justify-end gap-2 text-right">
            {desc ? (
              <span className="min-w-0 truncate text-sm font-medium text-foreground">{desc}</span>
            ) : null}
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{pct}%</span>
          </div>
          {game.steam_total_reviews != null ? (
            <p className="w-full text-right text-xs tabular-nums text-muted-foreground">
              {game.steam_total_reviews.toLocaleString()}개 평가
            </p>
          ) : null}
        </div>
      </div>
      <div className="relative mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 transition-[width] duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

function CriticScoreGraph({ game }: { game: GameRow }) {
  const score = game.critic_score!
  const clamped = Math.min(100, Math.max(0, score))

  return (
    <div
      className="w-full min-w-0 overflow-hidden rounded-xl border border-border bg-muted/30 px-3 pb-2.5 pt-3 dark:bg-muted/20"
      role="img"
      aria-label={`메타크리틱 등 크리틱 점수 ${score}점`}
    >
      <div className="flex min-h-[1.35rem] items-center justify-between gap-2">
        <span className="shrink-0 text-left text-sm font-semibold tracking-tight text-foreground">
          크리틱스코어
        </span>
        <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
          {score}
        </span>
      </div>
      <div className="relative mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-600 to-[hsl(var(--neon-purple))] transition-[width] duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

export function GameEvaluationScores({ game }: { game: GameRow }) {
  const showSteam = isValidSteamReview(game) && game.steam_positive_ratio != null
  const showCritic = game.critic_score != null

  if (!showSteam && !showCritic) {
    return (
      <p className="text-sm text-muted-foreground">등록된 점수 요약이 없습니다.</p>
    )
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      {showSteam ? <SteamScoreGraph game={game} /> : null}
      {showCritic ? <CriticScoreGraph game={game} /> : null}
    </div>
  )
}
