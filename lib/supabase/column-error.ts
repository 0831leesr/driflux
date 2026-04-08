/** PostgREST/Postgres: 없는 컬럼·스키마 캐시 불일치 등 (무관한 오류에 폴백하지 않도록 범위 제한) */
export function isMissingOrUnknownColumnError(message: string): boolean {
  const m = message.toLowerCase()
  if (m.includes("pgrst204") || m.includes("schema cache")) return true
  if (m.includes("could not find") && m.includes("column")) return true
  if (m.includes("does not exist") && (m.includes("column") || m.includes("channel_image"))) return true
  return false
}
