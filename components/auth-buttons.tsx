"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { LogIn } from "lucide-react"
import type { User } from "@supabase/supabase-js"

import { createBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button, type ButtonProps } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function LoginButton({ className }: Pick<ButtonProps, "className">) {
  const pathname = usePathname()
  const loginHref =
    pathname && pathname !== "/login"
      ? `/login?next=${encodeURIComponent(pathname)}`
      : "/login"

  return (
    <Button
      asChild
      size="sm"
      className={cn(
        "bg-[hsl(var(--neon-purple))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--neon-purple))]/80",
        className,
      )}
    >
      <Link href={loginHref}>
        <LogIn className="h-4 w-4" />
        로그인
      </Link>
    </Button>
  )
}

export const LogoutButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function LogoutButton({ className, variant = "ghost", onClick, ...props }, ref) {
    const router = useRouter()
    const supabase = createBrowserClient()

    return (
      <Button
        ref={ref}
        type="button"
        variant={variant}
        className={cn("justify-start", className)}
        onClick={async (e) => {
          onClick?.(e)
          if (e.defaultPrevented) return
          await supabase.auth.signOut()
          router.refresh()
        }}
        {...props}
      >
        로그아웃
      </Button>
    )
  },
)
LogoutButton.displayName = "LogoutButton"

function userDisplayName(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined
  const fullName = meta?.full_name
  const name = meta?.name
  if (typeof fullName === "string" && fullName.length > 0) return fullName
  if (typeof name === "string" && name.length > 0) return name
  const email = user.email
  if (email) return email.split("@")[0] ?? "User"
  return "User"
}

function userAvatarUrl(user: User): string | undefined {
  const meta = user.user_metadata as Record<string, unknown> | undefined
  const url = meta?.avatar_url
  return typeof url === "string" && url.length > 0 ? url : undefined
}

export function UserAccountMenu({ user }: { user: User }) {
  const name = userDisplayName(user)
  const avatarUrl = userAvatarUrl(user)
  const initial = name.slice(0, 1).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="relative h-9 w-9 rounded-full p-0"
          aria-label="계정 메뉴"
        >
          <Avatar className="h-9 w-9">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt="" referrerPolicy="no-referrer" />
            ) : null}
            <AvatarFallback className="text-xs">{initial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{name}</p>
            {user.email ? (
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            ) : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer p-0 focus:bg-transparent">
          <LogoutButton className="w-full px-2 py-1.5 font-normal" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
