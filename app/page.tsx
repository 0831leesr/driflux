import DrifluxHome from "@/components/driflux-home"

/** 60초마다 재검증 - unstable_cache와 함께 초기 로딩 속도 개선 */
export const revalidate = 60

export default function Page() {
  return <DrifluxHome />
}