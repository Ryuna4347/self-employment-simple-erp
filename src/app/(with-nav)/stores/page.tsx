import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { isViewer } from "@/lib/role-utils"
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

  return <StoresClient />
}
