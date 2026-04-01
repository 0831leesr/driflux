import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

/** Validates that a `next` value is a safe local path (prevents open-redirect). */
function isSafeRedirect(next: string | null): next is string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next")
  const error = requestUrl.searchParams.get("error")

  // OAuth provider returned an error — send user back to login with error flag
  if (error) {
    return NextResponse.redirect(new URL("/login?error=OAuthFailed", requestUrl.origin))
  }

  if (code) {
    const supabase = await createServerClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      return NextResponse.redirect(new URL("/login?error=OAuthFailed", requestUrl.origin))
    }
  }

  const destination = isSafeRedirect(next) ? next : "/"
  return NextResponse.redirect(new URL(destination, requestUrl.origin))
}
