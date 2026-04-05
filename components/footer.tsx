import Link from "next/link"

export function Footer() {
  return (
    <footer className="mt-auto shrink-0 border-t border-border bg-card/30 py-8 text-center text-xs text-muted-foreground">
      <div className="mx-auto max-w-2xl px-4">
        {/* Chzzk data timing */}
        <p className="leading-relaxed">
          Richzem(리치젬)에 표시되는 치지직 라이브·시청자 등 정보는 수집·갱신 시점에 따라 치지직
          앱/웹 화면과 실시간으로 완전히 일치하지 않을 수 있습니다.
        </p>

        {/* Disclaimer */}
        <p className="mt-2 leading-relaxed">
          Richzem is an independent project and is not affiliated with, endorsed by, or sponsored
          by NAVER Corp., Valve Corporation, or Twitch Interactive, Inc.
        </p>

        {/* Trademark notices */}
        <div className="mt-2 space-y-0.5 opacity-75">
          <p>Chzzk and the Chzzk logo are trademarks of NAVER Corp.</p>
          <p>Steam and the Steam logo are trademarks of Valve Corporation.</p>
          <p>Game metadata and imagery are provided by IGDB.com.</p>
          <p>All other trademarks are property of their respective owners.</p>
        </div>

        {/* Navigation links */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
          <Link href="/about" className="transition-colors hover:text-foreground">
            서비스 소개
          </Link>
          <span className="text-border">·</span>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            이용약관
          </Link>
          <span className="text-border">·</span>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            개인정보처리방침
          </Link>
          <span className="text-border">·</span>
          <a
            href="mailto:admin@richzem.com"
            className="transition-colors hover:text-foreground"
          >
            문의 / 버그 제보
          </a>
        </div>

        <p className="mt-3 opacity-60">© 2026 Richzem. All rights reserved.</p>
      </div>
    </footer>
  )
}
