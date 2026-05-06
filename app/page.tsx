import { Suspense } from "react"
import RichzemHome from "@/components/richzem-home"
import { NeutralPageLoading } from "@/components/neutral-page-loading"

// 치지직 라이브 주기(60s)와 맞춤. ISR 캐시 히트 시 CDN이 즉시 제공 → TTFB ↓
export const revalidate = 60

// Suspense로 감싸면 AppShell(헤더·사이드바)이 먼저 스트리밍되어 FCP를 앞당깁니다.
// 홈 데이터 fetch가 완료되면 NeutralPageLoading 스켈레톤 대신 실제 콘텐츠가 스트리밍됩니다.
export default function Page() {
  return (
    <Suspense fallback={<NeutralPageLoading />}>
      <RichzemHome />
    </Suspense>
  )
}
