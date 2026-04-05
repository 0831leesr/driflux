import { NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"
import { createServerClient } from "@/lib/supabase/server"

export type SessionUserResult = { user: User } | { response: NextResponse }

/** Route handlers: returns 401 JSON unless a Supabase session exists. */
export async function requireSessionUser(): Promise<SessionUserResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  return { user }
}
