import RichzemHome from "@/components/richzem-home"

/** 60초마다 재검증 - getTopLiveGames ISR revalidate(60s)와 맞춤 */
export const revalidate = 60

export default function Page() {
  return <RichzemHome />
}