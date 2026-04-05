import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { isSafeInternalRedirect } from "@/lib/safe-redirect"
import { GoogleLoginButton } from "@/components/google-login-button"
import { LoginBrandLogos } from "@/components/login-brand-logos"

export const metadata: Metadata = {
  title: "로그인",
  description: "Richzem에 로그인하여 더 많은 기능을 경험하세요.",
}

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { next, error } = await searchParams

  if (user) redirect(isSafeInternalRedirect(next) ? next : "/")

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <LoginBrandLogos />
          <p className="text-sm text-muted-foreground">
            로그인하여 더 많은 기능을 경험하세요
          </p>
        </div>

        {/* OAuth error banner */}
        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>로그인에 실패했습니다. 다시 시도해 주세요.</span>
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/10">
          <GoogleLoginButton next={next} />

          <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
            계속 진행하면 Richzem의{" "}
            <a href="/terms" className="underline underline-offset-2 hover:text-foreground">
              이용약관
            </a>{" "}
            및{" "}
            <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
              개인정보처리방침
            </a>
            에 동의한 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  )
}
