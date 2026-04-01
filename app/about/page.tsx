import type { Metadata } from "next"
import { BarChart2, Gem, Search, Star, TrendingUp, Tv2 } from "lucide-react"

export const metadata: Metadata = {
  title: "서비스 소개 | Richzem",
  description:
    "Richzem(리치젬)은 치지직 스트리밍 트렌드를 분석하고 숨겨진 보석 같은 방송을 발굴하는 서비스입니다.",
}

const features = [
  {
    icon: TrendingUp,
    title: "실시간 트렌드 차트",
    description:
      "지금 이 순간 치지직에서 가장 많이 방송되는 게임을 실시간 시청자 수 기준으로 한눈에 파악합니다.",
  },
  {
    icon: Tv2,
    title: "게임별 라이브 현황",
    description:
      "특정 게임을 선택하면 현재 방송 중인 스트리머 목록과 시청자 수를 바로 확인할 수 있습니다.",
  },
  {
    icon: Gem,
    title: "숨겨진 보석 발굴",
    description:
      "시청자는 많지 않지만 가파르게 성장 중인 게임과 스트리머를 발굴해 남들보다 먼저 발견하세요.",
  },
  {
    icon: Search,
    title: "게임 & 스트리머 탐색",
    description:
      "장르, 태그, 게임 이름으로 원하는 방송을 빠르게 찾고, 즐겨찾기로 저장해 언제든 다시 볼 수 있습니다.",
  },
  {
    icon: BarChart2,
    title: "스팀 연동 메타데이터",
    description:
      "Steam 게임 정보(평점, 장르, 출시일)와 치지직 방송 데이터를 결합해 더 풍부한 맥락을 제공합니다.",
  },
  {
    icon: Star,
    title: "팔로우 & 개인화",
    description:
      "관심 있는 게임과 스트리머를 팔로우하면 맞춤 피드로 최신 동향을 놓치지 않고 확인합니다.",
  },
]

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      {/* Hero */}
      <div className="text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--neon-purple))]/15 mb-5">
          <span className="text-3xl font-black text-[hsl(var(--neon-purple))]">R</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-foreground">
          Richzem
          <span className="ml-2 text-[hsl(var(--neon-purple))]">리치젬</span>
        </h1>
        <p className="mt-3 text-lg font-medium text-muted-foreground">
          풍부한 재미에 도달하다
        </p>
      </div>

      {/* Mission */}
      <section className="mt-12 rounded-2xl border border-border bg-card p-7">
        <h2 className="text-xl font-bold text-foreground">서비스 미션</h2>
        <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
          <p>
            <strong className="text-foreground">Richzem(리치젬)</strong>은{" "}
            <em>"Rich(풍부한) + Gem(보석)"</em>의 합성어로,{" "}
            <strong className="text-foreground">풍부한 재미에 도달한다</strong>는 의미를 담고
            있습니다.
          </p>
          <p>
            네이버 치지직(CHZZK)의 실시간 스트리밍 데이터와 Steam·IGDB의 게임 메타데이터를
            결합하여, 아직 발견되지 않은 숨겨진 보석 같은 방송과 게임을 찾아드립니다.
          </p>
          <p>
            리치젬은 화려한 대형 스트리머뿐 아니라 막 성장하는 신인, 마니아층이 즐기는 니치
            게임까지 스트리밍 생태계 전체를 한눈에 조망할 수 있도록 돕는 데이터 기반 탐색 서비스입니다.
          </p>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mt-12">
        <h2 className="text-xl font-bold text-foreground">주요 기능</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-[hsl(var(--neon-purple))]/40"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--neon-purple))]/10">
                  <Icon className="h-4.5 w-4.5 text-[hsl(var(--neon-purple))]" />
                </div>
                <h3 className="font-semibold text-foreground">{title}</h3>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Note */}
      <section className="mt-12 rounded-xl border border-border bg-muted/30 px-6 py-5 text-sm leading-relaxed text-muted-foreground">
        <p>
          본 서비스는 비상업적 목적의 개인 프로젝트로 운영되며, 네이버(치지직), Valve(스팀),
          IGDB와 공식 제휴 관계가 없습니다. 서비스 내 표시되는 게임 이미지 및 스트리머 정보의
          저작권은 원작자 및 해당 플랫폼에 있습니다.
        </p>
      </section>
    </main>
  )
}
