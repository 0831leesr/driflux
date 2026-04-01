"use client"

import { useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GoogleLoginButtonProps {
  next?: string
}

export function GoogleLoginButton({ next }: GoogleLoginButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    const supabase = createBrowserClient()

    const redirectUrl = new URL(`${location.origin}/auth/callback`)
    if (next) redirectUrl.searchParams.set("next", next)

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl.toString(),
        queryParams: {
          prompt: "select_account",
        },
      },
    })
    // Loading stays true during redirect — no need to reset
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={loading}
      onClick={handleLogin}
      className="relative w-full gap-3 border-border bg-card text-foreground hover:bg-muted hover:text-foreground disabled:opacity-70"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        /* Google "G" logo SVG */
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0"
        >
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
      )}
      <span>{loading ? "리디렉션 중..." : "Google로 계속하기"}</span>
    </Button>
  )
}
