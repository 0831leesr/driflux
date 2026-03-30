import { createClient } from "@/lib/supabase/server"
import { LoginButton, UserAccountMenu } from "@/components/auth-buttons"

/** Server component: resolves session for the main nav auth controls. */
export async function AppHeaderAuth() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) return <UserAccountMenu user={user} />
  return <LoginButton />
}
