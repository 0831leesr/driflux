import { Metadata } from "next"

export const metadata: Metadata = {
  title: "개인정보처리방침 (Privacy Policy)",
  description: "Richzem 개인정보처리방침을 확인하세요.",
}

const sections = [
  {
    title: "1. 수집하는 개인정보 항목",
    content:
      "(소셜 로그인 연동 시) 이메일 주소, 프로필 이미지, 닉네임, 서비스 이용 기록(팔로우, 즐겨찾기 등)이 수집될 수 있습니다.",
  },
  {
    title: "2. 개인정보의 수집 및 이용 목적",
    content:
      "수집된 개인정보는 사용자 식별, 개인화된 서비스 제공(즐겨찾기 유지), 서비스 개선을 위해 사용됩니다.",
  },
  {
    title: "3. 개인정보의 보유 및 이용 기간",
    content:
      "회원이 탈퇴를 요청하거나 개인정보 동의를 철회하는 경우, 수집된 개인정보는 지체 없이 파기합니다.",
  },
  {
    title: "4. 제3자 제공",
    content:
      "수집된 데이터는 클라우드 데이터베이스(Supabase)에 안전하게 보관되며, 법령에 의한 경우를 제외하고는 외부로 제공되지 않습니다.",
  },
]

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground">개인정보처리방침 (Privacy Policy)</h1>

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
