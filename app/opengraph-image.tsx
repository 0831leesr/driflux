import { ImageResponse } from "next/og"

export const alt = "리치젬 — 치지직 라이브 방송 트렌드, 게임·스트리머 탐색"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f0f12",
          background: "linear-gradient(135deg, #0f0f12 0%, #1a1a24 50%, #0f0f12 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              backgroundColor: "#8b5cf6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
            fontWeight: "bold",
            color: "white",
          }}
        >
          R
        </div>
        <span
          style={{
            fontSize: 48,
            fontWeight: "bold",
            color: "white",
            letterSpacing: "-0.02em",
          }}
        >
          Richzem
        </span>
        </div>
        <p
          style={{
            fontSize: 24,
            color: "#a1a1aa",
            margin: 0,
            maxWidth: 720,
            textAlign: "center",
            lineHeight: 1.35,
          }}
        >
          치지직 라이브 방송 트렌드, 게임·스트리머 탐색
        </p>
        <p
          style={{
            fontSize: 18,
            color: "#71717a",
            margin: "12px 0 0 0",
          }}
        >
          실시간 트렌드 · Steam 할인 · 게임 상세
        </p>
      </div>
    ),
    { ...size }
  )
}
