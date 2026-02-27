"use client"

import { cn } from "@/lib/utils"

interface DonutChartProps {
  /** 0–100 값 (비율 또는 점수) */
  value: number
  /** 중앙에 표시할 텍스트 */
  centerLabel: string
  /** 차트 크기 (px) */
  size?: number
  /** stroke 두께 */
  strokeWidth?: number
  /** 긍정/점수 부분 색상 (녹색) */
  positiveColor?: string
  /** 그 외 부분 색상 (붉은색) */
  negativeColor?: string
  className?: string
}

/** 도넛형 그래프 - 긍정/점수(녹색) + 나머지(붉은색), 중앙에 값 표시 */
export function DonutChart({
  value,
  centerLabel,
  size = 64,
  strokeWidth = 8,
  positiveColor = "#22c55e",
  negativeColor = "#ef4444",
  className,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedValue = Math.min(100, Math.max(0, value))
  const positiveLength = (clampedValue / 100) * circumference
  const negativeLength = circumference - positiveLength

  return (
    <div className={cn("relative inline-flex", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* 붉은색: 그 외 부분 (나머지) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={negativeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${negativeLength} ${positiveLength}`}
          strokeDashoffset={0}
          strokeLinecap="round"
        />
        {/* 녹색: 긍정/점수 비율 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={positiveColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${positiveLength} ${negativeLength}`}
          strokeDashoffset={-negativeLength}
          strokeLinecap="round"
          className="transition-[stroke-dasharray,stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      {/* 중앙 텍스트 */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ fontSize: size * 0.22, fontWeight: 600 }}
      >
        <span className="text-foreground tabular-nums">{centerLabel}</span>
      </div>
    </div>
  )
}
