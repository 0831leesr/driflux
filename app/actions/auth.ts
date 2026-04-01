"use server"

import { redirect } from "next/navigation"
import { createServerClient, createAdminClient } from "@/lib/supabase/server"

/**
 * Permanently deletes the currently authenticated user's account.
 * Uses the admin client to bypass RLS and delete from auth.users.
 * Signs the user out and redirects to home on success.
 */
export async function deleteAccount(): Promise<{ error: string } | never> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)

  if (error) {
    return { error: "계정 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요." }
  }

  await supabase.auth.signOut()
  redirect("/")
}
