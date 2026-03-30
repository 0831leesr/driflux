import { Metadata } from "next"

export const metadata: Metadata = {
  title: "About Richzem",
  description:
    "Richzem(리치젬)은 흩어져 있는 게임 스트리밍 생태계를 하나로 모아보고, 숨겨진 트렌드를 발견하기 위해 시작된 프로젝트입니다.",
}

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground">About Richzem</h1>

      <div className="mt-8 space-y-6 text-muted-foreground leading-relaxed">
        <p>
          Richzem(리치젬)은 흩어져 있는 게임 스트리밍 생태계를 하나로 모아보고,
          숨겨진 트렌드를 발견하기 위해 시작된 프로젝트입니다.
        </p>
        <p>
          네이버 치지직(CHZZK)의 실시간 방송 데이터와 Steam의 게임 메타데이터 등을 결합하여,
          유저가 새로운 게임을 발굴하고 스트리밍 트렌드를 한눈에 파악할 수 있도록 돕습니다.
        </p>
        <p>
          본 서비스는 비상업적 목적의 개인 프로젝트로 운영되며,
          유저 여러분의 즐거운 게임 라이프를 응원합니다.
        </p>
      </div>
    </main>
  )
}
