import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"

/** Browser Supabase client for Client Components. */
export function createBrowserClient() {
  return createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

/** @deprecated Prefer `createBrowserClient` — kept for existing call sites. */
export function createClient() {
  return createBrowserClient()
}
