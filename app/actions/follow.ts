"use server"

import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase/server"

export type FollowTargetType = "game" | "tag" | "streamer"

export interface FollowResult {
  followed?: boolean
  error?: string
}

/**
 * Toggle follow state for a target.
 * Returns { followed: true } on INSERT, { followed: false } on DELETE,
 * or { error: 'Unauthorized' } if not logged in.
 */
export async function toggleFollow(
  targetId: string,
  targetType: FollowTargetType,
): Promise<FollowResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  const { data: existing } = await supabase
    .from("user_follows")
    .select("target_id")
    .eq("user_id", user.id)
    .eq("target_id", targetId)
    .eq("target_type", targetType)
    .maybeSingle()

  if (existing) {
    await supabase
      .from("user_follows")
      .delete()
      .eq("user_id", user.id)
      .eq("target_id", targetId)
      .eq("target_type", targetType)

    revalidatePath("/")
    return { followed: false }
  } else {
    await supabase.from("user_follows").insert({
      user_id: user.id,
      target_id: targetId,
      target_type: targetType,
    })

    revalidatePath("/")
    return { followed: true }
  }
}

/**
 * Check whether the current user follows the given target.
 * Returns false for unauthenticated users.
 */
export async function checkIsFollowed(
  targetId: string,
  targetType: FollowTargetType,
): Promise<boolean> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return false

  const { data } = await supabase
    .from("user_follows")
    .select("target_id")
    .eq("user_id", user.id)
    .eq("target_id", targetId)
    .eq("target_type", targetType)
    .maybeSingle()

  return !!data
}

/**
 * Get all target_ids the current user follows for a given type.
 * Returns [] for unauthenticated users.
 */
export async function getUserFollows(targetType: FollowTargetType): Promise<string[]> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data } = await supabase
    .from("user_follows")
    .select("target_id")
    .eq("user_id", user.id)
    .eq("target_type", targetType)

  return (data ?? []).map((row) => row.target_id as string)
}
