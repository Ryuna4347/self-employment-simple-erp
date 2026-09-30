import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { isViewer } from "@/lib/role-utils"
import { isPlaceSearchEnabled } from "@/lib/kakao-local"
import { StoresClient } from "./components/stores-client"

/**
 * 매장 관리 페이지
 *
 * VIEWER는 일반 콘솔 접근이 차단되어 관리자 대시보드로 리다이렉트된다.
 */
export default async function StoresPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/?sessionExpired=true")
  }

  if (isViewer(session.user.role)) {
    redirect("/admin/dashboard")
  }

  // 매장 검색(상호 검색)은 서버에 KAKAO_REST_API_KEY가 있을 때만 노출 (키 자체는 전달하지 않음)
  return <StoresClient placeSearchEnabled={isPlaceSearchEnabled()} />
}
