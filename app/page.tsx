import DrifluxHome from "@/components/driflux-home"

/** 30초마다 재검증 - 게임 카드 스트림 통계와 상세 페이지 수치 일치 */
export const revalidate = 30

export default function Page() {
  return <DrifluxHome />
}