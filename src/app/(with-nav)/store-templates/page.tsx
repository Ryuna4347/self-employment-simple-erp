import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { isViewer } from "@/lib/role-utils"
import { StoreTemplatesClient } from "./components/store-templates-client"

export default async function StoreTemplatesPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/?sessionExpired=true")
  }

  // 읽기 전용 계정은 관리자 대시보드로 리다이렉트
  if (isViewer(session.user.role)) {
    redirect("/admin/dashboard")
  }

  return <StoreTemplatesClient userId={session.user.id} userRole={session.user.role} />
}
