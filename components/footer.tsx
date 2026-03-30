import Link from "next/link"

export function Footer() {
  return (
    <footer className="mt-auto shrink-0 border-t border-border bg-card/30 py-8 text-center text-xs text-muted-foreground">
      <div className="mx-auto max-w-2xl px-4">
        {/* Disclaimer */}
        <p className="leading-relaxed">
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
            About Richzem
          </Link>
          <span className="text-border">·</span>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms of Service
          </Link>
          <span className="text-border">·</span>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy Policy
          </Link>
          <span className="text-border">·</span>
          <a
            href="mailto:admin@richzem.com"
            className="transition-colors hover:text-foreground"
          >
            Contact / Bug Report
          </a>
        </div>

        <p className="mt-3 opacity-60">© 2026 Richzem. All rights reserved.</p>
      </div>
    </footer>
  )
}
