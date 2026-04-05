import type { Metadata } from "next"
import Link from "next/link"
import {
  BarChart2,
  CalendarDays,
  Compass,
  Gamepad2,
  Heart,
  LayoutGrid,
  Radio,
  Scissors,
  Search,
  Tags,
  TrendingUp,
  UserCircle2,
  Video,
} from "lucide-react"
import { LoginBrandLogos } from "@/components/login-brand-logos"

export const metadata: Metadata = {
  title: "리치젬에 관하여",
  description:
    "Richzem(리치젬)의 메인·팔로우·탐색·캘린더 탭, 검색, 게임 상세 페이지 등 서비스 전반을 정리한 안내입니다.",
}

export default function RichzemAboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 lg:py-14">
      <div className="text-center">
        <LoginBrandLogos className="mb-4" />
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          리치젬에 관하여
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          <strong className="text-foreground">Richzem(리치젬)</strong>은 치지직(CHZZK) 라이브 데이터와 Steam·게임
          DB 정보를 묶어, 방송·트렌드·게임을 한곳에서 탐색할 수 있게 만든 서비스입니다.
        </p>
      </div>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <LayoutGrid className="h-5 w-5 text-[hsl(var(--neon-purple))]" />
          전체 화면 구성
        </h2>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
          <li>
            <strong className="text-foreground">상단 헤더</strong>: 로고, 본 안내로 이동하는 「리치젬에 관하여」,
            게임·스트리머·태그 검색창(PC), 다크/라이트 테마 전환, 로그인·계정 영역이 있습니다.
          </li>
          <li>
            <strong className="text-foreground">왼쪽 사이드바</strong> 데스크톱에서는 접기/펼치기가 가능합니다. 팔로우한
            게임·태그·스트리머, 캘린더에서 팔로우한 일정 등에 빠르게 접근할 수 있습니다.
          </li>
          <li>
            <strong className="text-foreground">본문</strong>은 선택한 메뉴·탭에 맞게 스크롤되며, 하단에는 푸터가
            이어집니다.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <TrendingUp className="h-5 w-5 text-[hsl(var(--neon-purple))]" />
          홈 상단 탭 네 가지
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          홈(
          <Link href="/" className="font-medium text-[hsl(var(--neon-purple))] underline-offset-4 hover:underline">
            /
          </Link>
          )에서는 상단 탭으로 큰 흐름이 나뉩니다. 「탐색」만 별도 경로{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">/explore</code>로 열립니다.
        </p>

        <div className="mt-5 space-y-4">
          <article className="rounded-xl border border-border bg-card p-5">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <Gamepad2 className="h-4 w-4 text-[hsl(var(--neon-purple))]" />
              메인
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              치지직에서 수집한 라이브 지표를 바탕으로, 홈에서 볼 수 있는 여러 목록·섹션을 한 페이지에 모아 둔 영역입니다.
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">실시간 트렌드</strong>: 라이브 시청자·방송 수와 함께, 어제·주간·월간
                과거 트렌드 구간을 바꿔 보며 비교할 수 있습니다.
              </li>
              <li>
                <strong className="text-foreground">급상승</strong>: 당일 집계된 일별 통계에서 모멘텀 지표가 양수인
                게임만 골라 나열합니다.
              </li>
              <li>
                <strong className="text-foreground">드롭스</strong>: 연동되는 경우 Steam/Chzzk 드롭 이벤트가 있는
                타이틀을 모읍니다(데이터 제공 상황에 따라 비어 있을 수 있습니다).
              </li>
              <li>
                <strong className="text-foreground">숨겨진 꿀잼</strong>(화면 표시명과 동일): 동시 라이브 채널 수·시청자
                수가 정해진 범위에 들어가는 게임만 남긴 뒤, 시청자 수와 채널 수로 만든 점수가 높은 순으로 일부를
                나열합니다.
              </li>
              <li>
                <strong className="text-foreground">따끈한 신작</strong>(화면 표시명과 동일): DB 출시일이 약 30일 이내인
                게임 중 현재 라이브가 있는 항목만 남기고, 시청자 수와 출시 경과 일수를 반영한 내부 점수로 순서를 매겨
                나열합니다.
              </li>
            </ul>
          </article>

          <article className="rounded-xl border border-border bg-card p-5">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <Heart className="h-4 w-4 text-[hsl(var(--neon-purple))]" />
              팔로우
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              로그인한 뒤 게임·태그·스트리머를 팔로우하면 맞춤 피드를 볼 수 있습니다. 하위 탭으로 기능이 나뉩니다.
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">게임</strong>: 팔로우한 게임 카테고리의 현재 라이브 방송 목록.
              </li>
              <li>
                <strong className="text-foreground">태그</strong>: 관심 태그에 맞는 라이브 방송.
              </li>
              <li>
                <strong className="text-foreground">스트리머</strong>: 팔로우한 채널이 온 에어일 때 모아서 표시.
              </li>
              <li>
                <strong className="text-foreground">다시보기</strong>: 팔로우한 게임의 치지직 다시보기(VOD) 목록.
              </li>
              <li>
                <strong className="text-foreground">저장</strong>: 북마크해 둔 다시보기와 클립을 각각 확인.
              </li>
            </ul>
          </article>

          <article className="rounded-xl border border-border bg-card p-5">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <Compass className="h-4 w-4 text-[hsl(var(--neon-purple))]" />
              탐색
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              <Link href="/explore" className="font-medium text-[hsl(var(--neon-purple))] underline-offset-4 hover:underline">
                게임 탐색
              </Link>
              페이지에서 라이브 중심 보기와 과거 트렌드(기간별) 목록 보기를 전환합니다.
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">라이브 모드</strong>: 현재 상위 라이브 게임을 카드 그리드로 나열하고,
                DB에 매칭된 게임은 가격·태그·특징 배지(신작·트렌딩·급상승 등)가 함께 보입니다.
              </li>
              <li>
                <strong className="text-foreground">트렌드 모드</strong>: 어제·주간·월간 베스트 탭으로 나누어 과거
                트렌드 랭킹을 보고, 태그로 범위를 좁힐 수 있습니다.
              </li>
            </ul>
          </article>

          <article className="rounded-xl border border-border bg-card p-5">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <CalendarDays className="h-4 w-4 text-[hsl(var(--neon-purple))]" />
              캘린더
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              이스포츠·패치·할인·콜라보 등으로 분류된 <strong className="text-foreground">예정 이벤트</strong>를
              월간 달력 형태로 보여 줍니다. 일부 일정은 팔로우해 두면 사이드바 등에서 함께 추적할 수 있습니다. 사용자
              정의 일정 추가·편집도 지원합니다.
            </p>
          </article>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Search className="h-5 w-5 text-[hsl(var(--neon-purple))]" />
          검색
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          화면 너비가 충분할 때(중간 크기 이상) 헤더 검색창에 키워드를 입력해{" "}
          <Link href="/search" className="font-medium text-[hsl(var(--neon-purple))] underline-offset-4 hover:underline">
            검색 결과
          </Link>
          로 이동할 수 있습니다. 좁은 화면에서는 주소{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">/search</code>로 직접 이동해 같은
          화면을 열 수 있습니다. 결과에는 <strong className="text-foreground">게임 목록</strong>과 검색어에 맞는{" "}
          <strong className="text-foreground">라이브·관련 스트림</strong>이 함께 표시되며, 게임 카드에서 상세 페이지로
          이어집니다.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Radio className="h-5 w-5 text-[hsl(var(--neon-purple))]" />
          게임 상세 페이지
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          각 게임은 <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">/game/[게임ID]</code>{" "}
          경로로 열립니다. 한 게임에 대해 치지직 콘텐츠와 스토어 정보를 한 화면에서 정리합니다.
        </p>
        <div className="mt-5 rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground">히어로 영역</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            헤더 이미지·표지, 표시 제목(한글 타이틀 우선),{" "}
            <strong className="text-foreground">라이브 채널 수·시청자 수</strong>, Steam 할인 배지,{" "}
            태그(#)
            링크, <strong className="text-foreground">게임 팔로우</strong>, Steam 스토어 열기가 있습니다.
            스팀 사용자 평가(도넛 차트)·크리틱 스코어가 있으면 함께 표시됩니다.
          </p>
          <h3 className="mt-4 font-semibold text-foreground">콘텐츠 탭</h3>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">라이브</strong>: 해당 게임 카테고리의 방송 카드. 선택 시 치지직 라이브
              페이지로 연결됩니다.
            </li>
            <li>
              <strong className="text-foreground">다시보기</strong>: 치지직 VOD. 목록 내에서{" "}
              <strong className="text-foreground">최신순·인기순</strong>으로 정렬할 수 있습니다.
            </li>
            <li>
              <strong className="text-foreground">클립</strong>: 기간·인기도 옵션(최근, 24시간/7일/30일/전체 인기 등)에
              맞춰 클립을 불러옵니다.
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Tags className="h-5 w-5 text-[hsl(var(--neon-purple))]" />
          태그별 페이지
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          게임 상세와 카드에서 태그를 누르면 <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">/tags/[태그명]</code>으로
          이동해, 같은 태그를 가진 다른 게임을 이어서 탐색할 수 있습니다.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <BarChart2 className="h-5 w-5 text-[hsl(var(--neon-purple))]" />
          데이터·개인화 요약
        </h2>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-muted-foreground">
          <li className="flex gap-2">
            <UserCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--neon-purple))]" />
            팔로우·북마크·캘린더 설정은 로그인 세션과 연동되며, 브라우저를 다시 열어도 이어집니다.
          </li>
          <li className="flex gap-2">
            <Video className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--neon-purple))]" />
            라이브·다시보기·클립은 치지직 웹으로 연결되어 실제 시청은 해당 플랫폼에서 이루어집니다.
          </li>
          <li className="flex gap-2">
            <Scissors className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--neon-purple))]" />
            가격·메타·이미지 등 게임 정보는 Steam·내부 DB를 바탕으로 표시됩니다.
          </li>
        </ul>
      </section>

      <section className="mt-10 rounded-xl border border-border bg-muted/30 px-5 py-5 text-sm leading-relaxed text-muted-foreground">
        <p>
          Richzem(리치젬)에 표시되는 치지직 라이브·시청자 등 정보는 수집·갱신 시점에 따라 치지직 앱/웹 화면과 실시간으로
          완전히 일치하지 않을 수 있습니다.
        </p>
        <p className="mt-3">
          Richzem(리치젬)은 네이버(치지직), Valve(Steam), IGDB 등과 공식 제휴가 있다는 뜻이 아닙니다. 화면에 나오는
          이미지·방송 정보의 권리는 원저작자 및 각 플랫폼에 있습니다.
        </p>
        <p className="mt-3">
          서비스 소개를 한 페이지로만 보고 싶다면{" "}
          <Link href="/about" className="font-medium text-[hsl(var(--neon-purple))] underline-offset-4 hover:underline">
            서비스 소개
          </Link>
          도 함께 참고해 주세요.
        </p>
      </section>
    </main>
  )
}
