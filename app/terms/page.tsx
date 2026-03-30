import { Metadata } from "next"

export const metadata: Metadata = {
  title: "이용약관 (Terms of Service)",
  description: "Richzem 서비스 이용약관을 확인하세요.",
}

const sections = [
  {
    title: "제1조 (목적)",
    content:
      "본 약관은 Richzem에서 제공하는 서비스의 이용 조건 및 절차, 권리 및 책임을 규정합니다.",
  },
  {
    title: "제2조 (서비스의 제공 및 변경)",
    content:
      "본 서비스는 제휴된 외부 플랫폼(치지직, 스팀 등)의 API 상태에 따라 예고 없이 중단되거나 변경될 수 있으며, 운영자는 이에 대해 법적 책임을 지지 않습니다.",
  },
  {
    title: "제3조 (저작권 및 면책 조항)",
    content:
      "사이트 내 표시되는 모든 게임 이미지, 영상, 스트리머 정보의 저작권은 원작자 및 해당 플랫폼에 있습니다. Richzem은 네이버(치지직), Valve(스팀) 등과 공식적인 제휴 관계가 없는 독립 프로젝트이며, 정보의 정확성이나 신뢰성에 대해 보증하지 않습니다.",
  },
  {
    title: "제4조 (사용자 의무)",
    content:
      "시스템 오류를 악용하거나 비정상적인 트래픽을 유발하는 경우, 사전 안내 없이 IP 차단 및 계정 이용이 제한될 수 있습니다.",
  },
]

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground">이용약관 (Terms of Service)</h1>

      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">{section.content}</p>
          </section>
        ))}
      </div>
    </main>
  )
}
