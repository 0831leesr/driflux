import { ImageResponse } from "next/og"

export const alt = "Driflux - Discover Game Streams & Sales"
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
            D
          </div>
          <span
            style={{
              fontSize: 48,
              fontWeight: "bold",
              color: "white",
              letterSpacing: "-0.02em",
            }}
          >
            Driflux
          </span>
        </div>
        <p
          style={{
            fontSize: 24,
            color: "#a1a1aa",
            margin: 0,
            maxWidth: 600,
            textAlign: "center",
          }}
        >
          Discover Game Streams &amp; Sales
        </p>
        <p
          style={{
            fontSize: 18,
            color: "#71717a",
            marginTop: 12,
            margin: 0,
          }}
        >
          Watch live streams • Find Steam sales • Explore games
        </p>
      </div>
    ),
    { ...size }
  )
}
