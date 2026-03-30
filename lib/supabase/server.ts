import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Admin client with Service Role Key (bypasses RLS).
 * Use for server-side operations that need full DB access (e.g. game_mappings read in cron).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL")
  }
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Supabase client for use inside unstable_cache() - does NOT use cookies.
 * Use only for public data fetches (trending games, streams, events).
 * Must not be used for user-specific or auth-dependent data.
 */
export function createClientForCache() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

/**
 * Cookie-aware Supabase client for Server Components, Server Actions, and Route Handlers.
 * Especially important if using Fluid compute: don't store this client in a global; create per call.
 */
export async function createServerClient() {
  const cookieStore = await cookies()

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component; session refresh runs in proxy.
          }
        },
      },
    },
  )
}

/** @deprecated Prefer `createServerClient` — kept for existing call sites. */
export async function createClient() {
  return createServerClient()
}
