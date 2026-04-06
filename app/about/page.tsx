import type { Metadata } from "next"
import { BarChart2, Layers, Search, Star, TrendingUp, Tv2 } from "lucide-react"
import { LoginBrandLogos } from "@/components/login-brand-logos"

export const metadata: Metadata = {
  title: "서비스 소개 | Richzem",
  description:
    "Richzem(리치젬)은 치지직·Steam·게임 DB를 묶어 메인·팔로우·탐색·캘린더와 검색·상세 화면에서 방송·트렌드·게임을 탐색할 수 있는 웹 서비스입니다.",
}

const features = [
  {
    icon: TrendingUp,
    title: "트렌드 목록",
    description:
      "실시간·어제·주간·월간 등 구간을 탭으로 바꿔 가며, 치지직 라이브 집계와 DB에 매칭된 게임 카드 목록을 볼 수 있습니다. 카드 좌상단에는 신작(D+N)·트렌딩·급상승·드롭스 등 조건에 맞을 때 특징 태그가 붙을 수 있습니다.",
  },
  {
    icon: Tv2,
    title: "게임별 라이브 목록",
    description:
      "게임 상세에서 해당 카테고리 방송 카드, 시청자 수·채널 수 요약, 치지직 라이브 페이지 링크를 제공합니다.",
  },
  {
    icon: Layers,
    title: "조건부 추천 섹션",
    description:
      "메인 화면에는 시청자·동시 방송 수 등 조건과 내부 점수에 따라 정렬된 부가 목록(예: 급상승, 조건에 맞는 중소 규모 라이브, 최근 출시 타이틀)이 있습니다.",
  },
  {
    icon: Search,
    title: "검색·태그",
    description:
      "게임 이름·태그 등으로 검색하고, 태그 페이지에서 같은 태그가 붙은 게임을 이어서 볼 수 있습니다.",
  },
  {
    icon: BarChart2,
    title: "Steam·메타 정보",
    description:
      "가격·할인, 사용자 평가 요약, 장르·태그, 출시일 등 DB와 Steam에 저장된 필드를 화면에 표시합니다. 일부 필드는 IGDB·동기화 작업을 거친 값입니다.",
  },
  {
    icon: Star,
    title: "계정·팔로우",
    description:
      "Google 로그인 후 게임·태그·스트리머 팔로우, 다시보기·클립 북마크, 캘린더 일정 팔로우 등 설정을 서버에 저장할 수 있습니다. 비로그인 시 팔로우 탭의 빈 화면 등에는 안내 문구가 표시될 수 있습니다. 좌측 사이드바에는 로그인 여부와 관계없이 실시간 트렌딩·급상승 게임 미니 목록이 제공됩니다. 저장한 영상 일부는 브라우저에도 남을 수 있습니다.",
  },
]

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      {/* Hero */}
      <div className="text-center">
        <LoginBrandLogos className="mb-5" />
        <h1 className="text-4xl font-black tracking-tight text-foreground">
          Richzem
          <span className="ml-2 text-[hsl(var(--neon-purple))]">리치젬</span>
        </h1>
      </div>

      {/* Mission */}
      <section className="mt-12 rounded-2xl border border-border bg-card p-7">
        <h2 className="text-xl font-bold text-foreground">서비스 소개</h2>
        <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
          <p>
            <strong className="text-foreground">Richzem(리치젬)</strong>은 네이버 치지직(CHZZK)에서 가져온
            라이브·VOD·클립 API 응답과, 내부 DB에 적재한 Steam·IGDB·수동 매핑 등의 게임 메타데이터를 조합해, 웹에서
            메인·팔로우·탐색·캘린더 탭과 검색·태그·게임 상세 등 화면을 제공합니다. 상단 탭 선택은 주소(
            <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">/</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">/?tab=</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">/explore</code>)와 맞춰
            유지됩니다.
          </p>
          <p>
            스트리밍과 스토어 정보를 한 화면에서 대조할 수 있도록 하는 것이 목적이며, 특정 스트리머나 게임을 보장하거나
            순위를 공식적으로 인증하지는 않습니다.
          </p>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mt-12">
        <h2 className="text-xl font-bold text-foreground">주요 화면·기능</h2>
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
          Richzem(리치젬)에 표시되는 치지직 라이브·시청자 등 정보는 치지직의 실제 데이터와 실시간으로 일치하지 않을
          수 있습니다.
        </p>
        <p className="mt-3">
          Richzem(리치젬)에 표시되는 게임 정보는 Steam·실제 스토어 및 게임과 오차가 있거나, 모든 항목이 표시되지 못할
          수 있습니다.
        </p>
        <p className="mt-3">
          Richzem(리치젬)은 네이버(치지직), Valve(스팀), IGDB와 공식 제휴 관계가 없습니다. 서비스 내 표시되는 게임
          이미지 및 스트리머 정보의 저작권은 원작자 및 해당 플랫폼에 있습니다.
        </p>
      </section>
    </main>
  )
}
