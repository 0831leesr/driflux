"use client"

import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { deleteAccount } from "@/app/actions/auth"

export function DeleteAccountButton() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    const confirmed = window.confirm(
      "정말로 탈퇴하시겠습니까?\n모든 데이터가 삭제되며 복구할 수 없습니다.",
    )
    if (!confirmed) return

    setPending(true)
    setError(null)

    const result = await deleteAccount()

    // deleteAccount redirects on success; only reaches here on error
    if (result && "error" in result) {
      setError(result.error)
      setPending(false)
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={pending}
        onClick={handleClick}
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-destructive outline-none transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5 shrink-0" />
        )}
        {pending ? "탈퇴 처리 중…" : "회원 탈퇴"}
      </button>
      {error && (
        <p className="mt-1 px-2 text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
