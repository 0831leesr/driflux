/** PostgREST / Supabase 오류 메시지에서 “컬럼 없음” 여부 추정 */
export function isPostgrestMissingColumnError(message: string | undefined): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return (
    (m.includes("column") && m.includes("does not exist")) ||
    (m.includes("could not find") && m.includes("column")) ||
    m.includes("42703")
  )
}

export function isPostgrestRpcNotFoundError(message: string | undefined): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return m.includes("could not find the function") || m.includes("function") && m.includes("does not exist")
}
