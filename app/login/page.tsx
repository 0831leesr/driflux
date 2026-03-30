import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { GoogleLoginButton } from "@/components/google-login-button"

export const metadata: Metadata = {
  title: "로그인",
  description: "Richzem에 로그인하여 더 많은 기능을 경험하세요.",
}

export default async function LoginPage() {
  // If already authenticated, redirect home
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect("/")

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        {/* Logo / brand mark */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--neon-purple))]/15">
            <span className="text-2xl font-black text-[hsl(var(--neon-purple))]">R</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Richzem에 로그인
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            로그인하여 더 많은 기능을 경험하세요
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/10">
          <GoogleLoginButton />

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
