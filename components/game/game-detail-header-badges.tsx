"use client"

import { Badge } from "@/components/ui/badge"
import { Flame, Gift, Sparkles, Tag, TrendingUp, type LucideIcon } from "lucide-react"
import type { FeatureTagItem, FeatureTagPreset } from "@/lib/feature-tags"

const PRESET_FEATURE_CONFIG: Record<FeatureTagPreset, { icon: LucideIcon; className: string }> = {
  트렌딩: { icon: TrendingUp, className: "bg-[hsl(var(--neon-purple))]" },
  급상승: { icon: Flame, className: "bg-red-500" },
  드롭스: { icon: Gift, className: "bg-violet-500" },
}

const NEW_RELEASE_BADGE_CLASS = "bg-amber-500"

/**
 * 게임 상세 헤더 — 신작 · 트렌딩 · 급상승 · 할인 순(좌→우). 할인은 항상 마지막.
 */
export function GameDetailHeaderBadgesRow({
  featureTags,
  discountRate,
}: {
  featureTags: FeatureTagItem[] | undefined
  discountRate: number | null | undefined
}) {
  const showDiscount = discountRate != null && discountRate > 0
  const items = featureTags ?? []
  if (items.length === 0 && !showDiscount) return null

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
      {items.map((item) => {
        if (item.kind === "new") {
          return (
            <Badge
              key={`new-${item.dPlus}`}
              className={`border-0 ${NEW_RELEASE_BADGE_CLASS} px-2 py-0.5 text-xs font-semibold text-white shadow-sm`}
            >
              <Sparkles className="mr-1 inline h-3 w-3" />
              신작 D+{item.dPlus}
            </Badge>
          )
        }
        const cfg = PRESET_FEATURE_CONFIG[item.tag]
        const Icon = cfg.icon
        return (
          <Badge
            key={item.tag}
            className={`border-0 ${cfg.className} px-2 py-0.5 text-xs font-semibold text-white shadow-sm`}
          >
            <Icon className="mr-1 inline h-3 w-3" />
            {item.tag}
          </Badge>
        )
      })}
      {showDiscount && (
        <Badge className="border-transparent bg-gradient-to-r from-amber-500 to-red-500 px-2 py-0.5 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-sm">
          <Tag className="mr-1 inline h-3 w-3 opacity-95" />
          -{discountRate}% 스팀 할인
        </Badge>
      )}
    </div>
  )
}
