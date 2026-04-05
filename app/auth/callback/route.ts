import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { isSafeInternalRedirect } from "@/lib/safe-redirect"

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

  const destination = isSafeInternalRedirect(next) ? next : "/"
  return NextResponse.redirect(new URL(destination, requestUrl.origin))
}
