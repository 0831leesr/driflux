import { Metadata } from "next"

export const metadata: Metadata = {
  title: "About Driflux",
  description: "Driflux는 흩어져 있는 게임 스트리밍 생태계를 하나로 모아보기 위해 시작된 프로젝트입니다.",
}

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground">About Driflux</h1>

      <div className="mt-8 space-y-6 text-muted-foreground leading-relaxed">
        <p>
          Driflux는 흩어져 있는 게임 스트리밍 생태계를 하나로 모아보기 위해 시작된 프로젝트입니다.
        </p>
        <p>
          네이버 치지직(CHZZK)의 실시간 방송 데이터, Steam의 게임 메타데이터 등을 결합하여,
          유저가 새로운 게임을 발견하고 트렌드를 파악할 수 있도록 돕습니다.
        </p>
        <p>
          본 서비스는 비상업적 목적의 개인 프로젝트로 운영됩니다.
        </p>
      </div>
    </main>
  )
}
