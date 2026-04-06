import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "이용약관 | Richzem",
  description: "Richzem 서비스 이용약관을 확인하세요.",
}

const sections = [
  {
    title: "제1조 (목적)",
    content: `본 약관은 Richzem(이하 "서비스")이 제공하는 스트리밍 트렌드 탐색 서비스의 이용 조건 및 절차, 서비스 제공자와 이용자의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.`,
  },
  {
    title: "제2조 (용어의 정의)",
    items: [
      '"서비스"란 Richzem이 운영하는 웹사이트 및 이에 부수하는 모든 기능을 의미합니다.',
      '"이용자"란 본 약관에 동의하고 서비스를 이용하는 모든 방문자 및 회원을 의미합니다.',
      '"회원"이란 소셜 로그인(Google OAuth)을 통해 계정을 생성하고 서비스에 가입한 이용자를 의미합니다.',
      '"콘텐츠"란 서비스 내에 표시되는 게임 정보, 스트리밍 데이터, 이미지, 텍스트 등 일체의 정보를 의미합니다.',
    ],
  },
  {
    title: "제3조 (약관의 게시 및 변경)",
    content: `본 약관은 서비스 하단에 게시함으로써 효력이 발생합니다. 서비스 운영자는 필요한 경우 관련 법령에 위반되지 않는 범위에서 본 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지 후 7일이 경과한 날부터 효력이 발생합니다. 변경 이후에도 계속 서비스를 이용하는 경우 변경된 약관에 동의한 것으로 간주됩니다.`,
  },
  {
    title: "제4조 (서비스의 제공 및 변경)",
    content: `본 서비스는 네이버 치지직(CHZZK), Valve Corporation(Steam), IGDB 등 제3자 API를 활용하여 운영됩니다. 해당 외부 플랫폼의 API 정책 변경, 서버 장애, 데이터 불일치 등으로 인해 서비스가 예고 없이 중단되거나 일부 기능이 제한될 수 있으며, 서비스 운영자는 이에 대한 법적 책임을 지지 않습니다. 운영자는 서비스를 상시 개선할 권리를 가지며, 기능의 추가·수정·삭제에 대해 별도로 통지하지 않을 수 있습니다. 이용 현황·성능 파악을 위한 통계 수집이 있을 수 있으며, 세부 내용은 개인정보처리방침에 따릅니다.`,
  },
  {
    title: "제5조 (저작권 및 면책 조항)",
    content: `서비스 내 표시되는 게임 이미지, 스트리밍 영상, 스트리머 정보, 게임 로고 등 모든 콘텐츠의 저작권은 원작자 및 해당 플랫폼(네이버, Valve, IGDB 등)에 있습니다. Richzem은 이들 회사와 공식적인 제휴·후원·승인 관계에 있지 않으며, 제공하는 정보의 정확성·최신성·신뢰성을 보증하지 않습니다. 치지직 라이브·시청자 등 정보는 치지직의 실제 데이터와 실시간으로 일치하지 않을 수 있고, 게임(Steam) 정보는 실제 스토어·게임과 오차가 있거나 모든 항목이 표시되지 못할 수 있습니다. 서비스 이용 중 발생하는 손해에 대해 운영자는 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.`,
  },
  {
    title: "제6조 (이용자의 의무)",
    items: [
      "이용자는 서비스 이용 시 관련 법령 및 본 약관의 규정을 준수해야 합니다.",
      "타인의 개인정보를 도용하거나, 타인의 계정으로 서비스에 접근하는 행위를 금합니다.",
      "서비스의 안정적인 운영을 방해하는 비정상적인 트래픽 유발, 자동화 도구를 이용한 크롤링·스크래핑 행위를 금합니다.",
      "시스템 오류를 악용하는 행위, 서비스에 대한 역공학(Reverse Engineering) 시도를 금합니다.",
      "위 의무를 위반하는 경우, 사전 안내 없이 IP 차단 및 계정 이용이 제한될 수 있습니다.",
    ],
  },
  {
    title: "제7조 (회원 가입 및 탈퇴)",
    content: `회원 가입은 Google 계정을 통한 소셜 로그인으로 이루어집니다. 회원은 상단 헤더의 프로필(계정) 메뉴에 있는 '회원 탈퇴'를 통해 계정을 삭제하고 탈퇴할 수 있습니다. 탈퇴 시 회원의 개인정보는 관련 법령이 정한 경우를 제외하고 지체 없이 삭제됩니다.`,
  },
  {
    title: "제8조 (서비스 이용 제한)",
    content: `운영자는 이용자가 본 약관을 위반하거나, 서비스의 정상적인 운영을 방해한다고 판단되는 경우, 사전 통보 없이 해당 이용자의 서비스 이용을 제한하거나 계정을 삭제할 수 있습니다.`,
  },
  {
    title: "제9조 (준거법 및 관할 법원)",
    content: `본 약관은 대한민국 법령에 따라 해석·적용됩니다. 서비스 이용과 관련하여 분쟁이 발생하는 경우, 관할 법원은 민사소송법에 따른 법원으로 합니다.`,
  },
]

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-foreground">이용약관</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          최종 업데이트: 2026년 4월 5일 &nbsp;·&nbsp; 본 약관은 Richzem 서비스 이용에 관한
          전반적인 조건을 규정합니다.
        </p>
      </div>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title} className="border-b border-border pb-8 last:border-0">
            <h2 className="text-base font-bold text-foreground">{section.title}</h2>
            {"content" in section && section.content ? (
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{section.content}</p>
            ) : null}
            {"items" in section && section.items ? (
              <ul className="mt-3 space-y-1.5 text-sm leading-7 text-muted-foreground">
                {section.items.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-border bg-muted/30 px-6 py-4 text-xs leading-relaxed text-muted-foreground">
        문의 사항은{" "}
        <a
          href="mailto:admin@richzem.xyz"
          className="underline underline-offset-2 hover:text-foreground"
        >
          admin@richzem.xyz
        </a>
        으로 연락해 주세요.
      </div>
    </main>
  )
}
