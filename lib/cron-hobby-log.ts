/** Single cron invocation target for Vercel Hobby-style limits; log when exceeded. */
export const CRON_HOBBY_TARGET_MS = 10_000

export function logCronAgainstHobbyTarget(job: string, startedAt: number): number {
  const durationMs = Date.now() - startedAt
  if (durationMs > CRON_HOBBY_TARGET_MS) {
    console.warn(
      `[Cron:${job}] ${durationMs}ms exceeds ${CRON_HOBBY_TARGET_MS}ms target — use smaller ?limit, shorter delays, or more frequent invocations`,
    )
  }
  return durationMs
}
