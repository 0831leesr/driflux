import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "개인정보처리방침 | Richzem",
  description: "Richzem 개인정보처리방침을 확인하세요.",
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-foreground">개인정보처리방침</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          최종 업데이트: 2026년 4월 5일 &nbsp;·&nbsp; Richzem은 「개인정보 보호법」 등 관련 법령을
          준수하기 위해 본 방침을 두고 있습니다.
        </p>
      </div>

      <div className="space-y-8">
        {/* 1 */}
        <section className="border-b border-border pb-8">
          <h2 className="text-base font-bold text-foreground">
            제1조 (개인정보의 처리 목적)
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Richzem은 다음의 목적을 위해 개인정보를 처리합니다. 처리된 개인정보는 다음 목적
            이외의 용도로는 이용되지 않으며, 목적이 변경될 경우 사전 동의를 구합니다.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm leading-7 text-muted-foreground">
            {[
              "회원 가입 및 본인 확인 (소셜 로그인 인증)",
              "개인화 서비스 제공 (팔로우, 즐겨찾기 등 사용자 설정 유지)",
              "서비스 이상 및 부정 이용 방지",
              "이용 통계·트래픽·성능 지표 수집을 통한 서비스 품질 유지",
            ].map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* 2 */}
        <section className="border-b border-border pb-8">
          <h2 className="text-base font-bold text-foreground">
            제2조 (수집하는 개인정보 항목 및 수집 방법)
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Google OAuth로 로그인하는 경우 아래 표의 항목이 인증 제공자(Google) 및 Supabase를
            경유해 수집·저장될 수 있습니다. 별도의 이메일·비밀번호 회원가입 양식은 사용하지 않습니다.
            비회원도 서비스를 열람할 수 있으며, 이 때에는 표에 적은 회원 식별 정보 대신 아래
            자동 수집·브라우저 저장 항목이 주로 적용됩니다.
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2.5 text-left font-semibold text-foreground">
                    수집 항목
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-foreground">
                    수집 목적
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-foreground">
                    필수 여부
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-muted-foreground">
                <tr>
                  <td className="px-4 py-2.5">이메일 주소</td>
                  <td className="px-4 py-2.5">회원 식별 및 본인 확인</td>
                  <td className="px-4 py-2.5">필수</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">프로필 이름</td>
                  <td className="px-4 py-2.5">서비스 내 표시 이름</td>
                  <td className="px-4 py-2.5">필수</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">아바타(프로필) 이미지 URL</td>
                  <td className="px-4 py-2.5">프로필 아이콘 표시</td>
                  <td className="px-4 py-2.5">선택</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">서비스 이용 기록</td>
                  <td className="px-4 py-2.5">팔로우·즐겨찾기 데이터 유지</td>
                  <td className="px-4 py-2.5">선택</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            이와 별도로, 서비스 접속 시 IP 주소, 브라우저·기기 유형, 접속 시각, 참조 경로 등
            이용 기록이 자동으로 생성되어 서버 로그 또는 호스팅·분석 도구에 저장될 수 있습니다. 웹
            분석·성능 측정 도구(Vercel Analytics, Speed Insights 등)가 페이지 조회·응답 시간 등의
            이벤트를 수집할 수 있으며, 해당 업체의 정책에 따라 익명화·집계된 형태로 처리될 수
            있습니다.
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            이용자 단말의 브라우저 저장소(localStorage 등)에는 화면 테마(다크/라이트) 설정, 북마크한
            다시보기·클립 식별 정보, 스트리머 카드 표시용 보조 데이터 등이 디바이스에 남을 수
            있습니다. 이 정보는 이용자 브라우저에 보관되며, 로그인 후 서버에 동기화되는 팔로우
            데이터와는 구분됩니다.
          </p>
        </section>

        {/* 3 */}
        <section className="border-b border-border pb-8">
          <h2 className="text-base font-bold text-foreground">
            제3조 (개인정보의 보유 및 이용 기간)
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            수집된 개인정보는 회원 탈퇴 시 또는 개인정보 처리 동의 철회 시 지체 없이(즉시)
            삭제합니다. 단, 관련 법령(「전자상거래 등에서의 소비자 보호에 관한 법률」 등)에서
            일정 기간 보관을 요구하는 경우에는 해당 법령에 따릅니다.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm leading-7 text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
              소비자 불만 또는 분쟁 처리에 관한 기록: 3년 (전자상거래법)
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
              서비스 접속 로그: 관련 법령이 정한 기간(예: 통신비밀보호법상 3개월)을 원칙으로 하되,
              실제 보관 기간은 호스팅·분석 서비스 설정에 따를 수 있습니다.
            </li>
          </ul>
        </section>

        {/* 4 */}
        <section className="border-b border-border pb-8">
          <h2 className="text-base font-bold text-foreground">
            제4조 (개인정보의 제3자 제공)
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Richzem은 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 아래의
            경우에는 예외로 합니다.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm leading-7 text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
              이용자가 사전에 동의한 경우
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
              법령에 의하거나 수사 목적으로 수사기관이 적법한 절차를 통해 요청하는 경우
            </li>
          </ul>
        </section>

        {/* 5 */}
        <section className="border-b border-border pb-8">
          <h2 className="text-base font-bold text-foreground">
            제5조 (개인정보 처리의 위탁)
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Richzem은 서비스 제공을 위해 아래와 같이 개인정보 처리를 위탁하고 있습니다.
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2.5 text-left font-semibold text-foreground">수탁 업체</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-foreground">위탁 업무</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-muted-foreground">
                <tr>
                  <td className="px-4 py-2.5">Supabase, Inc.</td>
                  <td className="px-4 py-2.5">회원 인증 및 데이터베이스 호스팅</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">Google LLC</td>
                  <td className="px-4 py-2.5">소셜 로그인(OAuth 2.0) 인증 처리</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">Vercel, Inc.</td>
                  <td className="px-4 py-2.5">웹 애플리케이션 호스팅 및 방문·성능 통계 수집</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 6 */}
        <section className="border-b border-border pb-8">
          <h2 className="text-base font-bold text-foreground">
            제6조 (이용자의 권리와 행사 방법)
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            이용자는 언제든지 자신의 개인정보를 조회하거나 수정, 삭제, 처리 정지를 요청할 수
            있습니다. 계정 삭제는 상단 헤더의 프로필(계정) 메뉴에 있는 '회원 탈퇴'를 통해
            요청할 수 있습니다. 브라우저에 저장된 테마·북마크 등은 브라우저 설정에서 직접 삭제해야
            할 수 있습니다. 그 외 문의는 아래 개인정보 보호책임자에게 연락하시기 바랍니다.
          </p>
        </section>

        {/* 7 */}
        <section className="border-b border-border pb-8">
          <h2 className="text-base font-bold text-foreground">
            제7조 (개인정보의 안전성 확보 조치)
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm leading-7 text-muted-foreground">
            {[
              "개인정보는 암호화된 HTTPS 통신을 통해 전송됩니다.",
              "데이터베이스는 Row-Level Security(RLS)가 적용되어 본인 데이터에만 접근 가능합니다.",
              "서비스 내 비밀번호를 별도로 저장하지 않으며, 인증은 전적으로 Google OAuth에 위임합니다.",
              "불필요한 개인정보를 수집하지 않으며, 최소 수집 원칙을 준수합니다.",
            ].map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* 8 */}
        <section>
          <h2 className="text-base font-bold text-foreground">
            제8조 (개인정보 보호책임자)
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            개인정보 처리에 관한 업무를 총괄하는 개인정보 보호책임자는 아래와 같습니다.
          </p>
          <div className="mt-3 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">담당자:</span> Richzem 운영팀
            </p>
            <p className="mt-1">
              <span className="font-medium text-foreground">이메일:</span>{" "}
              <a
                href="mailto:admin@richzem.com"
                className="underline underline-offset-2 hover:text-foreground"
              >
                admin@richzem.com
              </a>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
